# Dev Container 快速啟動指南

## 🚀 5 分鐘快速開始

### 步驟 1: 安裝必要工具

確保已安裝：

- ✅ [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/Mac) 或 [Docker Engine](https://docs.docker.com/engine/install/) (Linux)
- ✅ [Visual Studio Code](https://code.visualstudio.com/)
- ✅ [Dev Containers 擴充套件](vscode:extension/ms-vscode-remote.remote-containers)

### 步驟 2: 準備環境變數

```bash
# 複製範例環境變數檔案
cp .env.devcontainer.example .env

# 編輯 .env 檔案，填入必要的值
# 至少需要設定：
# - JWT_SECRET (可用 openssl rand -base64 32 產生)
# - SMTP 設定 (如需測試郵件功能)
# - Google OAuth (如需測試 Google 登入)
```

### 步驟 3: 啟動開發容器

**方法 A: 使用 VS Code 指令**

1. 開啟專案資料夾
2. 按 `F1` 或 `Ctrl+Shift+P`
3. 輸入 `Dev Containers: Reopen in Container`
4. 等待容器建構完成（首次約 5-10 分鐘）

**方法 B: 點擊通知**

- 如果 VS Code 顯示通知，直接點擊「在容器中重新開啟」

### 步驟 4: 驗證環境

容器啟動後，開啟終端機並執行：

```bash
# 檢查 Node.js 版本
node --version  # 應顯示 v24.x.x

# 檢查套件是否安裝
npm list --depth=0

# 檢查資料庫連線
psql -h db -U moa_user -d moa_db -c "SELECT version();"

# 啟動開發伺服器
npm run dev
```

開啟瀏覽器訪問 http://localhost:5173

## 📋 常用工作流程

### 開發應用程式

```bash
# 啟動開發伺服器（熱重載）
npm run dev

# 在另一個終端機啟動 email worker（如需郵件功能）
npm run worker:email
```

### 執行測試

```bash
# 單元測試
npm run test:unit

# API 測試
npm run test:api

# E2E 測試
npm run test:e2e

# 測試覆蓋率
npm run test:api:coverage
```

### 資料庫操作

```bash
# 執行遷移
npm run db:migrate

# 重設資料庫
npm run db:reset

# 開啟 Drizzle Studio (資料庫 UI)
npm run db:studio
# 訪問 https://local.drizzle.studio

# 使用 psql 連線
psql -h db -U moa_user -d moa_db
```

### 程式碼品質

```bash
# 檢查程式碼風格
npm run lint

# 自動修正
npm run format

# TypeScript 類型檢查
npm run check
```

## 🔧 進階操作

### 重新建構容器

當修改了 Dockerfile 或安裝新的系統套件時：

```bash
# VS Code 指令面板
Dev Containers: Rebuild Container

# 或使用指令
Dev Containers: Rebuild and Reopen in Container
```

### 連接到執行中的容器

```bash
# 使用 Docker 指令
docker exec -it moa_devcontainer_app sh

# 或在 VS Code 中開啟新終端機
```

### 啟動 Email Worker 服務

```bash
# 方法 1: 在容器內新終端機執行
npm run worker:email

# 方法 2: 啟動獨立 Docker 容器
docker compose -f .devcontainer/docker-compose.devcontainer.yml --profile worker up -d email-worker

# 查看 worker 日誌
docker compose -f .devcontainer/docker-compose.devcontainer.yml logs -f email-worker
```

### 管理郵件佇列

```bash
# 檢視佇列狀態
npm run queue:status

# 重試失敗的郵件
npm run queue:retry

# 清空佇列
npm run queue:clear

# 發送測試郵件
npm run queue:test
```

### 資料庫管理

```bash
# 備份資料庫
docker exec moa_devcontainer_postgres pg_dump -U moa_user moa_db > backup.sql

# 還原資料庫
docker exec -i moa_devcontainer_postgres psql -U moa_user moa_db < backup.sql

# 查看資料庫大小
docker exec moa_devcontainer_postgres psql -U moa_user -d moa_db -c "\l+"
```

## 🐛 疑難排解

### 問題：容器無法啟動

```bash
# 1. 檢查 Docker 是否執行
docker ps

# 2. 檢查日誌
docker compose -f .devcontainer/docker-compose.devcontainer.yml logs

# 3. 重新建構
docker compose -f .devcontainer/docker-compose.devcontainer.yml build --no-cache
```

### 問題：連接埠已被佔用

```bash
# Windows: 找出佔用連接埠的程式
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac: 找出並終止程式
lsof -ti:5173 | xargs kill -9
```

### 問題：npm install 失敗

```bash
# 1. 清除 node_modules volume
docker volume rm moa_devcontainer_node_modules

# 2. 在 VS Code 重新建構容器
Dev Containers: Rebuild Container
```

### 問題：資料庫連線失敗

```bash
# 1. 檢查資料庫容器狀態
docker compose -f .devcontainer/docker-compose.devcontainer.yml ps

# 2. 確認資料庫健康狀態
docker inspect moa_devcontainer_postgres | grep Health

# 3. 重啟資料庫
docker compose -f .devcontainer/docker-compose.devcontainer.yml restart db
```

### 問題：Playwright 測試失敗

```bash
# 安裝瀏覽器（如果需要）
npx playwright install

# 安裝系統依賴
npx playwright install-deps
```

## 📚 更多資源

- [完整使用文件](README.md)
- [設定檔案說明](CONFIGURATION.md)
- [專案 README](../README.md)
- [生產環境部署](../docs/PRODUCTION-DEPLOYMENT.md)
- [CI/CD 指南](../docs/CI-CD.md)

## 💡 實用技巧

### 1. 使用 SQLTools 管理資料庫

已預先設定好連線，點擊左側 SQLTools 圖示即可使用。

### 2. 設定 Git 別名

```bash
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
```

### 3. 自訂 Zsh 提示符

編輯 `~/.zshrc`:

```bash
# 在容器內執行
nano ~/.zshrc

# 新增或修改 ZSH_THEME
ZSH_THEME="agnoster"  # 或其他喜歡的主題

# 重新載入
source ~/.zshrc
```

### 4. 使用 VS Code 任務

按 `Ctrl+Shift+B` 可快速執行預定義任務（如建構、測試等）。

### 5. 多終端機視窗

- `Ctrl+Shift+5`: 分割終端機
- `Ctrl+Shift+`` `: 建立新終端機
- `Alt+方向鍵`: 在終端機間切換

## 🎯 下一步

1. ✅ 啟動開發伺服器
2. ✅ 執行測試確認環境正常
3. ✅ 閱讀 [專案 README](../README.md) 了解架構
4. ✅ 查看 [開發規範](../docs/STYLE.md)
5. ✅ 開始開發 🚀

---

**需要協助？** 查看 [疑難排解指南](README.md#疑難排解) 或提交 Issue。
