# docker-compose.prod.yml 使用說明

## 📖 概述

`docker-compose.prod.yml` 是生產環境的 Docker Compose 配置文件，用於在 **AWS EC2 或其他生產服務器**上部署應用。

與 `docker-compose.yml`（本地開發用）的主要區別：

- ✅ 使用 Docker Hub 上的預構建鏡像（不在服務器上構建）
- ✅ 生產級別的容器命名和卷管理
- ✅ 需要手動設定完整的環境變數（無默認值）

---

## 🚀 使用方式

### 方法 1: 直接使用（推薦用於 EC2）

#### 第 1 步：推送 Docker 鏡像到 Docker Hub

在**本地電腦**上執行：

```bash
# 1. 登入 Docker Hub
docker login

# 2. 構建鏡像
docker build -t your-dockerhub-username/moa:latest .

# 3. 推送到 Docker Hub
docker push your-dockerhub-username/moa:latest
```

#### 第 2 步：在 EC2 上準備環境變數

創建 `.env` 文件：

```bash
# 在 EC2 上創建 .env
nano .env
```

填入以下內容（**必須填寫所有變數**）：

```env
# Docker Hub 用戶名
DOCKER_USERNAME=your-dockerhub-username
APP_IMAGE=your-dockerhub-username/moa:v1.2.3
WORKER_IMAGE=your-dockerhub-username/moa:worker-v1.2.3

# Database
POSTGRES_USER=moa_user
POSTGRES_PASSWORD=your_strong_password_123456
POSTGRES_DB=moa_db
POSTGRES_PORT=5432
DATABASE_URL=postgres://moa_user:your_strong_password_123456@db:5432/moa_db

# JWT
JWT_SECRET=your_very_long_random_secret_key_at_least_32_characters_long
JWT_EXPIRES_IN=30d

# Application
PORT=5173
NODE_ENV=production

# Google OAuth (必須設置，否則 Google 登入會失敗)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Google Tag Manager (可選)
PUBLIC_GTM_ID=GTM-XXXXXXX
```

**生成安全密碼**：

```bash
# 生成資料庫密碼
openssl rand -base64 24

# 生成 JWT 密鑰
openssl rand -base64 48
```

#### 第 3 步：啟動服務

```bash
# 使用 prod 配置文件啟動
docker compose -f docker-compose.prod.yml up -d

# 查看服務狀態
docker compose -f docker-compose.prod.yml ps

# 查看日誌
docker compose -f docker-compose.prod.yml logs -f
```

#### 第 4 步：驗證部署

```bash
# 檢查健康狀態
curl http://localhost:5173/api/health

# 從瀏覽器訪問
# http://your-ec2-ip:5173
```

---

### 方法 2: 使用自動化腳本

創建一個生產部署腳本 `deploy-prod.sh`：

```bash
#!/bin/bash
set -e

echo "🚀 開始生產環境部署..."

# 檢查 .env
if [ ! -f .env ]; then
    echo "❌ 錯誤：找不到 .env 文件！"
    exit 1
fi

# 拉取最新鏡像
echo "📥 拉取最新 Docker 鏡像..."
docker compose -f docker-compose.prod.yml pull

# 停止舊服務
echo "🛑 停止舊服務..."
docker compose -f docker-compose.prod.yml down

# 啟動新服務
echo "🚀 啟動新服務..."
docker compose -f docker-compose.prod.yml up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 15

# 檢查狀態
echo "📊 服務狀態："
docker compose -f docker-compose.prod.yml ps

echo "✅ 部署完成！"
```

使用方式：

```bash
chmod +x deploy-prod.sh
./deploy-prod.sh
```

---

## 🔄 日常維護命令

### 查看服務狀態

```bash
docker compose -f docker-compose.prod.yml ps
```

### 查看日誌

```bash
# 查看所有日誌
docker compose -f docker-compose.prod.yml logs -f

# 只看應用日誌
docker compose -f docker-compose.prod.yml logs -f app

# 只看資料庫日誌
docker compose -f docker-compose.prod.yml logs -f db
```

### 重啟服務

```bash
# 重啟所有服務
docker compose -f docker-compose.prod.yml restart

# 只重啟應用
docker compose -f docker-compose.prod.yml restart app
```

### 停止服務

```bash
# 停止但保留數據
docker compose -f docker-compose.prod.yml stop

# 停止並刪除容器（數據卷保留）
docker compose -f docker-compose.prod.yml down

# 停止並刪除所有內容（包括數據，危險！）
docker compose -f docker-compose.prod.yml down -v
```

### 更新應用

```bash
# 1. 在本地推送新鏡像
docker build -t your-username/moa:latest .
docker push your-username/moa:latest

# 2. 在 EC2 上更新
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d app
```

---

## 🔍 故障排查

### 檢查容器健康狀態

```bash
docker compose -f docker-compose.prod.yml ps
```

如果看到 `unhealthy`：

```bash
# 查看詳細日誌
docker compose -f docker-compose.prod.yml logs app --tail=100

# 進入容器檢查
docker compose -f docker-compose.prod.yml exec app sh
```

### 資料庫連接問題

```bash
# 測試資料庫連接
docker compose -f docker-compose.prod.yml exec db psql -U moa_user -d moa_db

# 檢查環境變數
docker compose -f docker-compose.prod.yml exec app env | grep DATABASE
```

### 查看資源使用

```bash
# 查看 CPU 和內存使用
docker stats

# 查看磁碟使用
docker system df
```

---

## 🔐 安全建議

1. **不要提交 .env 到 Git**

   ```bash
   # 確保 .gitignore 包含
   echo ".env" >> .gitignore
   ```

2. **使用強密碼**
   - 資料庫密碼至少 16 字符
   - JWT 密鑰至少 32 字符

3. **限制端口訪問**
   - PostgreSQL (5432) 不應對外開放
   - 只在安全組開放必要的端口

4. **定期更新**
   ```bash
   # 更新基礎鏡像
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

---

## 📊 與 docker-compose.yml 的對比

| 特性     | docker-compose.yml | docker-compose.prod.yml |
| -------- | ------------------ | ----------------------- |
| 用途     | 本地開發           | 生產部署                |
| 鏡像來源 | 本地構建           | Docker Hub              |
| 環境變數 | 有默認值           | 必須全部提供            |
| 容器名稱 | `moa_*`            | `moa_*_prod`            |
| 數據卷   | `moa_pgdata`       | `moa_pgdata_prod`       |
| 熱重載   | 支持               | 不支持                  |
| 適用場景 | 開發測試           | EC2/生產服務器          |

---

## 💡 最佳實踐

### 1. 使用 GitHub Actions 自動部署

在推送代碼時自動構建和推送鏡像：

```yaml
# .github/workflows/cd.yml
name: CD
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/moa:latest
```

### 2. 使用健康檢查

配置文件已經包含健康檢查，確保服務正常運行才標記為健康。

### 3. 數據備份

```bash
# 備份資料庫
docker compose -f docker-compose.prod.yml exec db pg_dump -U moa_user moa_db > backup_$(date +%Y%m%d).sql

# 恢復資料庫
docker compose -f docker-compose.prod.yml exec -T db psql -U moa_user -d moa_db < backup_20250113.sql
```

---

## 🆘 常見問題

**Q: 為什麼需要 DOCKER_USERNAME？**
A: 用於指定從哪個 Docker Hub 帳號拉取鏡像。

**Q: 可以在本地使用這個配置嗎？**
A: 可以，但建議本地開發使用 `docker-compose.yml`，它支持熱重載和更方便的開發體驗。

**Q: 如何切換回開發模式？**
A: 使用 `docker compose -f docker-compose.yml up -d`

**Q: 數據會丟失嗎？**
A: 只要不使用 `-v` 標誌，數據卷會保留。即使刪除容器，數據也會保存在 `moa_pgdata_prod` 卷中。

---

## 📚 相關文檔

- [完整部署指南](./DEPLOYMENT.md)
