#!/bin/bash
set -euo pipefail

echo "===================================="
echo "   🚀 MOA Production 部署"
echo "===================================="
echo ""

# 讀取版本號
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
echo "📦 當前版本: $VERSION"
echo ""

# 檢測 Docker Compose 命令
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
    echo "📦 使用 docker-compose (v1)"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
    echo "📦 使用 docker compose (v2)"
else
    echo "❌ 錯誤：找不到 docker-compose 或 docker compose"
    echo "請先安裝 Docker Compose"
    exit 1
fi
echo ""

# 檢查 .env
if [ ! -f .env ]; then
    echo "❌ 錯誤：找不到 .env 文件！"
    echo "請參考 DEPLOYMENT-QUICK-START.md 創建 .env 文件"
    exit 1
fi

# 正規化 .env 的行尾，避免 CRLF 造成解析問題
if sed --version >/dev/null 2>&1; then
  sed -i 's/\r$//' .env || true
else
  # BusyBox/簡化 sed 兼容
  tr -d '\r' < .env > .env.tmp && mv .env.tmp .env || true
fi

# 載入 .env 文件中的環境變數
set -a
# Production .env is uploaded immediately before deployment.
# shellcheck disable=SC1091
source .env
set +a
echo ""

if [ -z "${APP_IMAGE:-}" ] || [ -z "${WORKER_IMAGE:-}" ]; then
    echo "❌ APP_IMAGE 與 WORKER_IMAGE 必須指定不可變版本標籤"
    exit 1
fi

if [ "${SKIP_MIGRATION:-false}" = "true" ]; then
    echo "❌ 正式部署不可略過 migrations，避免 schema 或資料修正尚未套用"
    exit 1
fi

# 先用正在運行容器的 immutable image ID 建立本機 rollback tag。
# 舊版 compose 可能只記錄 moa:latest；若直接保存名稱，pull 後它會指向新版本，無法回復。
PREVIOUS_APP_IMAGE_ID=$(docker inspect --format '{{.Image}}' moa_app_prod 2>/dev/null || true)
PREVIOUS_WORKER_IMAGE_ID=$(docker inspect --format '{{.Image}}' moa_email_worker_prod 2>/dev/null || true)
PREVIOUS_APP_IMAGE=""
PREVIOUS_WORKER_IMAGE=""
DEPLOYMENT_SUCCEEDED=false
SWITCHOVER_STARTED=false
ROLLBACK_ATTEMPTED=false

cleanup_rollback_tags() {
    if [ -n "$PREVIOUS_APP_IMAGE" ]; then
        docker image rm "$PREVIOUS_APP_IMAGE" >/dev/null 2>&1 || true
    fi
    if [ -n "$PREVIOUS_WORKER_IMAGE" ]; then
        docker image rm "$PREVIOUS_WORKER_IMAGE" >/dev/null 2>&1 || true
    fi
}

persist_env_value() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" .env; then
        sed -i "s|^${key}=.*$|${key}=${value}|" .env
    else
        printf '\n%s=%s\n' "$key" "$value" >> .env
    fi
}

persist_image_selection() {
    persist_env_value APP_IMAGE "$PREVIOUS_APP_IMAGE"
    persist_env_value WORKER_IMAGE "$PREVIOUS_WORKER_IMAGE"
    echo "🛟 已持久化 rollback image 選擇，後續 compose up 會維持舊版本"
}

finalize_deployment() {
    local status=$?
    trap - EXIT
    set +e
    if [ "$DEPLOYMENT_SUCCEEDED" = "true" ]; then
        cleanup_rollback_tags
    else
        if [ "$SWITCHOVER_STARTED" = "true" ] && [ "$ROLLBACK_ATTEMPTED" != "true" ]; then
            echo "⚠️ 部署切換期間發生錯誤，立即嘗試回復舊版本"
            rollback || true
        fi

        if [ -n "$PREVIOUS_APP_IMAGE" ] && [ -n "$PREVIOUS_WORKER_IMAGE" ]; then
            # 任何失敗（包含 pull／migration／health check）都把持久設定還原到舊映像。
            persist_image_selection
        else
            cleanup_rollback_tags
        fi
    fi
    exit "$status"
}
trap finalize_deployment EXIT

if [ -n "$PREVIOUS_APP_IMAGE_ID" ] && [ -n "$PREVIOUS_WORKER_IMAGE_ID" ]; then
    docker image tag "$PREVIOUS_APP_IMAGE_ID" "moa-rollback:app"
    PREVIOUS_APP_IMAGE="moa-rollback:app"
    docker image tag "$PREVIOUS_WORKER_IMAGE_ID" "moa-rollback:worker"
    PREVIOUS_WORKER_IMAGE="moa-rollback:worker"
    echo "🛟 已固定目前運行映像，供部署失敗時回復"
elif [ -n "$PREVIOUS_APP_IMAGE_ID" ] || [ -n "$PREVIOUS_WORKER_IMAGE_ID" ]; then
    # 已有部分服務時不能當成首次部署；停止它們後將無法透過 rollback 恢復。
    echo "❌ 既有 App／Worker 不完整，無法準備完整回復映像，部署已中止"
    echo "   請先恢復缺少的舊版容器；目前既有服務保持原狀"
    exit 1
else
    echo "ℹ️ 沒有既有 App／Worker 容器，視為首次部署，沒有可用 rollback 映像"
fi

rollback() {
    ROLLBACK_ATTEMPTED=true
    if [ -z "$PREVIOUS_APP_IMAGE" ] || [ -z "$PREVIOUS_WORKER_IMAGE" ]; then
        echo "⚠️ 無先前版本可回復，保留目前容器狀態"
        return 1
    fi

    echo "↩️ 回復舊版本：$PREVIOUS_APP_IMAGE / $PREVIOUS_WORKER_IMAGE"
    APP_IMAGE="$PREVIOUS_APP_IMAGE" WORKER_IMAGE="$PREVIOUS_WORKER_IMAGE" \
        $DOCKER_COMPOSE -f docker-compose.prod.yml up -d app email-worker
}

# 拉取最新鏡像
echo "📥 [1/5] 拉取最新 Docker 鏡像..."
if $DOCKER_COMPOSE -f docker-compose.prod.yml pull; then
    echo "✅ 鏡像拉取成功"
else
    echo "❌ 鏡像拉取失敗"
    exit 1
fi
echo ""

# 確保資料庫服務正在運行
echo "🔍 [2/5] 確保資料庫服務運行中..."
if ! docker ps | grep -q moa_postgres_prod; then
    echo "   資料庫容器未運行，正在啟動..."
    $DOCKER_COMPOSE -f docker-compose.prod.yml up -d db
    echo "   等待資料庫就緒..."
    sleep 10

    # 等待資料庫健康檢查通過
    max_wait=30
    waited=0
    while [ $waited -lt $max_wait ]; do
        if docker ps | grep -q "moa_postgres_prod.*healthy"; then
            echo "✅ 資料庫已就緒"
            break
        fi
        echo "   等待資料庫健康檢查... ($waited/$max_wait 秒)"
        sleep 2
        waited=$((waited + 2))
    done
else
    echo "✅ 資料庫服務已在運行"
fi
echo ""

# 資料補修必須在舊服務停止後執行，避免漏掉最後離房或誤判建立中的空房。
# stop 完成後才進入 migration；先啟用 rollback，涵蓋 stop 部分失敗的情況。
echo "🛡️ [3/5] 暫停應用服務，進入資料修正維護期間..."
SWITCHOVER_STARTED=true
if ! $DOCKER_COMPOSE -f docker-compose.prod.yml stop --timeout 30 app email-worker; then
    echo "❌ 無法停止舊服務，不執行資料修正"
    exit 1
fi
echo ""

# 執行資料庫 Migrations
echo "🔄 [4/5] 執行資料庫 Migrations..."
# 在 Docker 容器中執行 migrations，這樣可以訪問 Docker 網絡中的 'db' 主機
echo "   使用 Docker 容器執行 migrations..."
if docker run --rm \
    --network moa_moa_network \
    -v "$(pwd)/migrations:/app/migrations" \
    -v "$(pwd)/scripts:/app/scripts" \
    -v "$(pwd)/package.json:/app/package.json" \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e NODE_ENV=production \
    "${APP_IMAGE}" \
    npm run db:migrate -- --repair-empty-games; then
    echo "✅ Migrations 與空局補修執行成功"
else
    echo "❌ Migrations 執行失敗！"
    echo "   將嘗試恢復舊版本，不啟動新版容器"
    exit 1
fi
echo ""

# 啟動應用服務
echo "🚀 [5/5] 啟動應用服務..."
if ! $DOCKER_COMPOSE -f docker-compose.prod.yml up -d app email-worker; then
    echo "❌ 應用服務切換失敗，立即回復舊版本"
    rollback || true
    exit 1
fi
echo "✅ 應用服務和 Email Worker 已啟動"
echo ""

# 等待服務就緒並檢查健康狀態
echo "⏳ 等待服務就緒..."
sleep 10

echo "🏥 檢查服務健康狀態..."
max_attempts=10
attempt=1
health_response=""

while [ "$attempt" -le "$max_attempts" ]; do
    if health_response=$(curl -fsS http://localhost:5173/api/health 2>/dev/null) && \
        printf '%s' "$health_response" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
        echo "✅ 服務健康檢查通過！"
        break
    fi

    if [ "$attempt" -eq "$max_attempts" ]; then
        echo "❌ 服務健康檢查失敗"
        echo "📋 最近的應用日誌："
        $DOCKER_COMPOSE -f docker-compose.prod.yml logs --tail=100 app || true
        rollback || true
        exit 1
    fi

    echo "   等待中... ($attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

DEPLOYMENT_SUCCEEDED=true

echo ""
echo "===================================="
echo "   ✅ 部署完成！版本: $VERSION"
echo "===================================="
echo ""
echo "📊 查看服務狀態："
echo "  $DOCKER_COMPOSE -f docker-compose.prod.yml ps"
echo ""
echo "📋 查看應用日誌："
echo "  $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f app"
echo ""
echo "📧 查看 Email Worker 日誌："
echo "  $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f email-worker"
echo ""
