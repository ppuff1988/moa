#!/bin/bash
set -e

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
source .env
set +a
echo ""

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

# 停止舊的應用服務（保留資料庫）
echo "🛑 [3/5] 停止舊應用服務..."
$DOCKER_COMPOSE -f docker-compose.prod.yml stop app email-worker 2>/dev/null || echo "   應用服務未運行（可能是首次部署）"
echo ""

# 執行資料庫 Migrations
echo "🔄 [4/5] 執行資料庫 Migrations..."
SKIP_MIGRATION=${SKIP_MIGRATION:-false}

if [ "$SKIP_MIGRATION" = "true" ]; then
    echo "   ⏭️  跳過 migrations（SKIP_MIGRATION=true）"
else
    # 在 Docker 容器中執行 migrations，這樣可以訪問 Docker 網絡中的 'db' 主機
    echo "   使用 Docker 容器執行 migrations..."
    if docker run --rm \
        --network moa_moa_network \
        -v "$(pwd)/migrations:/app/migrations" \
        -v "$(pwd)/scripts:/app/scripts" \
        -v "$(pwd)/package.json:/app/package.json" \
        -e DATABASE_URL="${DATABASE_URL}" \
        -e NODE_ENV=production \
        ${DOCKER_USERNAME}/moa:latest \
        npm run db:migrate; then
        echo "✅ Migrations 執行成功"
    else
        echo "❌ Migrations 執行失敗！"
        echo "   嘗試重啟舊版本應用..."
        $DOCKER_COMPOSE -f docker-compose.prod.yml up -d app email-worker
        exit 1
    fi
fi
echo ""

# 啟動應用服務
echo "🚀 [5/5] 啟動應用服務..."
$DOCKER_COMPOSE -f docker-compose.prod.yml up -d app email-worker
echo "✅ 應用服務和 Email Worker 已啟動"
echo ""

# 等待服務就緒並檢查健康狀態
echo "⏳ 等待服務就緒..."
sleep 10

echo "🏥 檢查服務健康狀態..."
max_attempts=10
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:5173/api/health > /dev/null 2>&1; then
        echo "✅ 服務健康檢查通過！"
        break
    fi

    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "⚠️  警告：服務健康檢查超時"
        echo "請手動檢查服務狀態："
        echo "  $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f app"
    else
        echo "   等待中... ($attempt/$max_attempts)"
        sleep 2
    fi
done

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
