#!/bin/bash

# MOA 應用快速部署腳本
# 這個腳本會協助你在 EC2 上部署應用

set -e  # 遇到錯誤立即退出

echo "🚀 開始部署 MOA 應用..."

# 檢查是否存在 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  找不到 .env 文件"
    echo "正在從 .env.example 創建 .env..."
    cp .env.example .env
    echo "⚠️  請編輯 .env 文件並填入正確的環境變數！"
    echo "運行: nano .env"
    exit 1
fi

# 停止並刪除舊容器
echo "🛑 停止舊容器..."
docker compose down

# 拉取最新代碼（如果使用 git）
if [ -d .git ]; then
    echo "📥 拉取最新代碼..."
    git pull
fi

# 構建並啟動容器
echo "🔨 構建應用..."
docker compose build --no-cache

echo "🚀 啟動服務..."
docker compose up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 10

# 檢查服務狀態
echo "📊 服務狀態："
docker compose ps

# 顯示日誌
echo ""
echo "📋 最近的日誌："
docker compose logs --tail=50

echo ""
echo "✅ 部署完成！"
echo "🌐 應用運行在: http://localhost:5173"
echo ""
echo "常用命令："
echo "  查看日誌: docker compose logs -f"
echo "  重啟服務: docker compose restart"
echo "  停止服務: docker compose down"
