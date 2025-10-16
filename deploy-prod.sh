#!/bin/bash
set -e

echo "===================================="
echo "   🚀 MOA Production 部署"
echo "===================================="
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

# 檢查必要的環境變數
echo "🔍 檢查環境變數..."
required_vars=("DOCKER_USERNAME" "POSTGRES_PASSWORD" "JWT_SECRET" "DATABASE_URL")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env || [ -z "$(grep "^$var=" .env | cut -d '=' -f2)" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ 錯誤：以下環境變數未設置或為空："
    printf '   - %s\n' "${missing_vars[@]}"
    echo ""
    echo "請編輯 .env 文件並設置這些變數"
    exit 1
fi

echo "✅ 環境變數檢查通過"
echo ""

# 拉取最新鏡像
echo "📥 [1/4] 拉取最新 Docker 鏡像..."
if $DOCKER_COMPOSE -f docker-compose.prod.yml pull; then
    echo "✅ 鏡像拉取成功"
else
    echo "❌ 鏡像拉取失敗，請檢查："
    echo "   1. DOCKER_USERNAME 是否正確"
    echo "   2. Docker Hub 上是否有該鏡像"
    echo "   3. 網路連接是否正常"
    exit 1
fi
echo ""

# 停止舊服務
echo "🛑 [2/4] 停止舊服務..."
$DOCKER_COMPOSE -f docker-compose.prod.yml down
echo "✅ 舊服務已停止"
echo ""

# 啟動新服務
echo "🚀 [3/4] 啟動新服務..."
$DOCKER_COMPOSE -f docker-compose.prod.yml up -d
echo "✅ 新服務已啟動"
echo ""

# 等待服務啟動
echo "⏳ [4/4] 等待服務就緒..."
sleep 10

# 檢查服務健康狀態
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

# 檢查狀態
echo "📊 服務狀態："
$DOCKER_COMPOSE -f docker-compose.prod.yml ps
echo ""

# 顯示最近的日誌
echo "📋 最近的應用日誌："
$DOCKER_COMPOSE -f docker-compose.prod.yml logs --tail=20 app
echo ""

echo "===================================="
echo "  ✅ 部署完成！"
echo "===================================="
echo ""
echo "📝 下一步："
echo "1. 訪問: http://\$(curl -s ifconfig.me):5173"
echo "2. 查看日誌: $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f"
echo "3. 檢查狀態: $DOCKER_COMPOSE -f docker-compose.prod.yml ps"
echo ""
