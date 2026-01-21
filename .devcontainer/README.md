# MOA 遊戲開發容器

本專案使用 Visual Studio Code 的 Dev Containers 功能，提供一致的開發環境。

## 功能特色

- **自動化環境設定**：容器啟動後自動安裝相依套件和執行資料庫遷移
- **整合開發工具**：預先安裝所有必要的 VS Code 擴充套件
- **資料庫支援**：內建 PostgreSQL 16 資料庫，並自動初始化測試資料
- **效能最佳化**：使用 Docker volume 提升 `node_modules` 存取速度
- **完整工具鏈**：包含 Git、GitHub CLI、PostgreSQL 用戶端等工具

## 必要條件

1. [Docker Desktop](https://www.docker.com/products/docker-desktop) 或 [Podman](https://podman.io/)
2. [Visual Studio Code](https://code.visualstudio.com/)
3. [Dev Containers 擴充套件](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

## 快速開始

### 方法一：使用 VS Code 指令面板

1. 在 VS Code 中開啟專案資料夾
2. 按 `F1` 或 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
3. 輸入並選擇 `Dev Containers: Reopen in Container`
4. 等待容器建構和初始化完成 (首次約需 5-10 分鐘)

### 方法二：使用提示通知

如果 VS Code 偵測到 `.devcontainer` 配置，會顯示提示通知：

- 點擊「在容器中重新開啟」按鈕

## 容器服務

開發容器包含以下服務：

### 1. 應用程式容器 (`app`)

- **功能**：主要開發環境
- **連接埠**：5173 (應用程式)
- **工具**：Node.js 24、npm、Git、PostgreSQL 用戶端、Zsh

### 2. 資料庫容器 (`db`)

- **映像**：PostgreSQL 16 Alpine
- **連接埠**：5432
- **預設認證**：
  - 使用者：`moa_user`
  - 密碼：`moa_pass`
  - 資料庫：`moa_db`
- **資料持久化**：使用 Docker volume `moa_devcontainer_pgdata`

### 3. Email Worker 容器 (`email-worker`) - 選擇性

- **功能**：背景郵件佇列處理器
- **啟動方式**：預設不啟動，需要時可手動啟動

## 常用開發指令

進入容器後，可以使用以下指令：

```bash
# 啟動開發伺服器
npm run dev

# 執行單元測試
npm run test:unit

# 執行 API 測試
npm run test:api

# 執行 E2E 測試
npm run test:e2e

# 執行資料庫遷移
npm run db:migrate

# 開啟 Drizzle Studio (資料庫管理介面)
npm run db:studio

# 啟動 Email Worker
npm run worker:email

# 檢視郵件佇列狀態
npm run queue:status

# 執行 Linting
npm run lint

# 格式化程式碼
npm run format
```

## 資料庫連線

### 使用 SQLTools 擴充套件 (已預先設定)

1. 點擊左側活動列的 SQLTools 圖示
2. 選擇「MOA PostgreSQL」連線
3. 即可瀏覽和查詢資料庫

### 使用指令列

```bash
# 從容器內連線
psql -h db -U moa_user -d moa_db

# 從主機連線 (需先轉發連接埠)
psql -h localhost -p 5432 -U moa_user -d moa_db
```

## 手動啟動 Email Worker

如果需要測試郵件功能，可以啟動 email worker 服務：

```bash
# 方法一：在新終端機中執行
npm run worker:email

# 方法二：使用 docker-compose 啟動獨立服務
docker compose -f .devcontainer/docker-compose.devcontainer.yml --profile worker up email-worker
```

## 環境變數設定

專案根目錄的 `.env` 檔案會自動掛載到容器中。確保包含以下必要變數：

```env
# Database
POSTGRES_USER=moa_user
POSTGRES_PASSWORD=moa_pass
POSTGRES_DB=moa_db
DATABASE_URL=postgres://moa_user:moa_pass@db:5432/moa_db

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=30d

# SMTP (如需測試郵件功能)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=MOA Game

# Google OAuth (如需測試 Google 登入)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# Google Tag Manager (選擇性)
PUBLIC_GTM_ID=GTM-XXXXXXX
```

## 疑難排解

### 容器建構失敗

```bash
# 清除 Docker 快取重新建構
docker compose -f .devcontainer/docker-compose.devcontainer.yml build --no-cache
```

### 資料庫連線問題

```bash
# 檢查資料庫容器狀態
docker compose -f .devcontainer/docker-compose.devcontainer.yml ps

# 檢視資料庫日誌
docker compose -f .devcontainer/docker-compose.devcontainer.yml logs db
```

### 相依套件安裝問題

```bash
# 刪除 node_modules volume 重新安裝
docker volume rm moa_devcontainer_node_modules
# 然後重新建構容器
```

### 重設資料庫

```bash
# 停止所有容器
docker compose -f .devcontainer/docker-compose.devcontainer.yml down

# 刪除資料庫 volume
docker volume rm moa_devcontainer_pgdata

# 重新啟動
docker compose -f .devcontainer/docker-compose.devcontainer.yml up -d
```

### 效能問題 (Windows/Mac)

如果在 Windows 或 Mac 上遇到效能問題，建議：

1. 確保 Docker Desktop 分配足夠的資源（至少 4GB RAM、2 CPU）
2. 使用 Docker volume 而非 bind mount（專案已配置）
3. 考慮排除大型檔案夾（如 `node_modules`、`build`）

## 進階設定

### 自訂 VS Code 設定

編輯 `.devcontainer/devcontainer.json` 中的 `customizations.vscode.settings` 區塊。

### 新增擴充套件

在 `.devcontainer/devcontainer.json` 的 `extensions` 陣列中新增擴充套件 ID。

### 修改容器配置

編輯 `.devcontainer/docker-compose.devcontainer.yml` 或 `.devcontainer/Dockerfile.devcontainer`。

修改後需要重新建構容器：

- 使用指令面板：`Dev Containers: Rebuild Container`

## 與標準 Docker Compose 的差異

| 功能         | `.devcontainer`          | 標準 `docker-compose.yml` |
| ------------ | ------------------------ | ------------------------- |
| 用途         | VS Code 開發環境         | 本地開發/測試/生產部署    |
| 應用程式容器 | 保持執行，等待開發者指令 | 自動啟動應用程式          |
| 程式碼掛載   | 完整專案資料夾           | 通常只在生產環境複製      |
| node_modules | 使用 volume 加速         | 通常在容器內              |
| 工具         | 包含完整開發工具鏈       | 最小化映像                |

## 貢獻

如果你發現開發容器有任何問題或改進建議，歡迎提交 Issue 或 Pull Request。

## 相關資源

- [VS Code Dev Containers 文件](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container 規格](https://containers.dev/)
- [專案主要 README](../README.md)
- [Docker 最佳實作](.github/instructions/docker.instructions.md)
