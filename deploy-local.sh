#!/bin/bash

# MOA 專案部署腳本
# 使用方式: ./deploy.sh [environment]
# 環境: production (預設) 或 staging

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 開始部署到 $ENVIRONMENT 環境..."

# 檢查環境變數
if [ ! -f .env ]; then
    echo "❌ 錯誤: .env 檔案不存在"
    echo "請複製 .env.example 並填入正確的環境變數"
    exit 1
fi

# 載入環境變數
source .env

# 檢查必要的環境變數
required_vars=("DATABASE_URL" "JWT_SECRET" "POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 錯誤: 環境變數 $var 未設定"
        exit 1
    fi
done

echo "✓ 環境變數檢查通過"

# 執行測試
echo "🧪 執行測試..."
if npm run test; then
    echo "✓ 測試通過"
else
    echo "❌ 測試失敗"
    read -p "是否繼續部署? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 建置應用程式
echo "🔨 建置應用程式..."
npm run build
echo "✓ 建置完成"

# 建置 Docker 映像
echo "🐳 建置 Docker 映像..."
if [ -n "$DOCKER_USERNAME" ]; then
    docker build -t $DOCKER_USERNAME/moa:latest .
    docker tag $DOCKER_USERNAME/moa:latest $DOCKER_USERNAME/moa:$(git rev-parse --short HEAD)
    echo "✓ Docker 映像建置完成"

    # 推送到 Docker Hub
    read -p "是否推送映像到 Docker Hub? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 推送 Docker 映像..."
        docker push $DOCKER_USERNAME/moa:latest
        docker push $DOCKER_USERNAME/moa:$(git rev-parse --short HEAD)
        echo "✓ 推送完成"
    fi
else
    docker build -t moa:latest .
    echo "✓ Docker 映像建置完成"
fi

# 啟動容器
echo "🚢 啟動容器..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
else
    docker-compose down
    docker-compose up -d
fi

echo "✓ 容器已啟動"

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 10

# 健康檢查
echo "🏥 執行健康檢查..."
for i in {1..30}; do
    if curl -f http://localhost:5173/api/health > /dev/null 2>&1; then
        echo "✓ 健康檢查通過"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ 健康檢查失敗"
        echo "查看日誌:"
        docker-compose logs --tail=50
        exit 1
    fi
    echo "等待中... ($i/30)"
    sleep 2
done

# 顯示狀態
echo ""
echo "🎉 部署完成！"
echo ""
echo "📊 容器狀態:"
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.prod.yml ps
else
    docker-compose ps
fi

echo ""
echo "📝 查看日誌:"
echo "  docker-compose logs -f"
echo ""
echo "🌐 應用程式已運行在:"
echo "  http://localhost:5173"
echo ""
echo "🗄️ 資料庫連接資訊:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: $POSTGRES_DB"
echo "  User: $POSTGRES_USER"

