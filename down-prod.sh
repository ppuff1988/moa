#!/bin/bash

# 停止生產環境的 Docker 容器腳本

echo "======================================"
echo "停止生產環境 Docker 容器"
echo "======================================"
echo ""

# 檢查 docker-compose 是否安裝
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 錯誤: docker-compose 未安裝"
    echo "   請先安裝 Docker Compose"
    exit 1
fi

# 檢查 docker-compose.prod.yml 是否存在
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 錯誤: docker-compose.prod.yml 文件不存在"
    exit 1
fi

# 停止並移除容器
echo "🛑 正在停止生產環境容器..."
docker-compose -f docker-compose.prod.yml down

# 檢查是否成功
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 生產環境容器已成功停止"
    echo ""

    # 顯示當前運行的容器
    echo "當前運行的容器:"
    docker ps --filter "name=moa_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo ""
    echo "❌ 停止容器時發生錯誤"
    exit 1
fi

echo ""
echo "======================================"
echo "完成"
echo "======================================"

