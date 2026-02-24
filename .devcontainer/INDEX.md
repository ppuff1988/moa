# .devcontainer 結構總覽

```
.devcontainer/
├── 📄 devcontainer.json                 # VS Code Dev Container 主要配置檔案
├── 🐳 docker-compose.devcontainer.yml   # 開發容器的 Docker Compose 配置
├── 🐳 Dockerfile.devcontainer           # 開發環境專用 Dockerfile
│
├── 📚 文件檔案
│   ├── README.md                        # 完整使用文件與疑難排解指南
│   ├── QUICKSTART.md                    # 5 分鐘快速啟動指南
│   ├── CONFIGURATION.md                 # 詳細配置說明
│   └── INDEX.md                         # 本檔案（結構總覽）
│
├── 🛠️ 工具腳本
│   ├── check-environment.sh             # 環境檢查腳本（Bash）
│   └── check-environment.ps1            # 環境檢查腳本（PowerShell）
│
└── 📝 範例檔案
    └── .env.devcontainer.example        # 環境變數範例檔案
```

## 📖 檔案說明

### 核心設定檔

#### [devcontainer.json](devcontainer.json)

**用途**：VS Code Dev Container 的主要配置檔案

**定義內容**：

- ✅ 使用的 Docker Compose 檔案
- ✅ 工作區路徑和掛載設定
- ✅ VS Code 設定和擴充套件
- ✅ 連接埠轉發
- ✅ 容器生命週期指令

**關鍵設定**：

```json
{
	"name": "MOA 遊戲開發環境",
	"dockerComposeFile": "docker-compose.devcontainer.yml",
	"service": "app",
	"workspaceFolder": "/workspace",
	"postCreateCommand": "npm install && npm run db:migrate",
	"forwardPorts": [5173, 5432]
}
```

#### [docker-compose.devcontainer.yml](docker-compose.devcontainer.yml)

**用途**：定義開發容器的服務配置

**包含服務**：

- 🚀 `app`：主要開發容器（Node.js 24 + 開發工具）
- 🗄️ `db`：PostgreSQL 16 資料庫
- 📧 `email-worker`：郵件佇列處理器（選擇性啟動）

**Volume 管理**：

- `moa_devcontainer_node_modules`：快取 node_modules
- `moa_devcontainer_pgdata`：持久化資料庫資料

#### [Dockerfile.devcontainer](Dockerfile.devcontainer)

**用途**：建構開發環境專用的 Docker 映像

**已安裝工具**：

- Node.js 24、npm、Git
- Bash、Zsh、oh-my-zsh
- PostgreSQL client
- Vim、Nano 編輯器
- Chromium、Firefox、WebKit（供 Playwright 使用）
- Sudo 權限支援

### 文件檔案

#### [README.md](README.md)

**內容**：完整的使用文件

- 🚀 快速開始指南
- 📋 常用開發指令
- 🗄️ 資料庫連線說明
- 📧 Email Worker 啟動方式
- 🐛 疑難排解指南

#### [QUICKSTART.md](QUICKSTART.md)

**內容**：5 分鐘快速啟動指南

- ⚡ 最精簡的啟動步驟
- 📋 常用工作流程
- 🔧 進階操作
- 🐛 常見問題快速解決

#### [CONFIGURATION.md](CONFIGURATION.md)

**內容**：詳細的配置說明

- 📄 各設定檔案詳解
- 🔧 自訂設定方法
- ⚡ 效能最佳化技巧
- 🔍 疑難排解深入分析

### 工具腳本

#### [check-environment.sh](check-environment.sh)

**用途**：檢查開發環境是否正確設定（Bash 版本）

**檢查項目**：

- ✅ 系統工具（Node.js、npm、Git 等）
- ✅ Node.js 套件安裝狀態
- ✅ 環境變數設定
- ✅ 資料庫連線
- ✅ 連接埠狀態
- ✅ Git 設定

**使用方式**：

```bash
bash .devcontainer/check-environment.sh
```

#### [check-environment.ps1](check-environment.ps1)

**用途**：檢查開發環境是否正確設定（PowerShell 版本）

**使用方式**：

```powershell
.\.devcontainer\check-environment.ps1
```

### 範例檔案

#### [.env.devcontainer.example](../.env.devcontainer.example)

**用途**：環境變數範例檔案

**包含設定**：

- 🗄️ 資料庫設定
- 🔐 JWT 設定
- 📧 SMTP 郵件設定
- 🔑 Google OAuth 設定
- 📊 Google Tag Manager（選用）
- 🤖 Telegram Bot（選用）

**使用方式**：

```bash
cp .env.devcontainer.example .env
# 然後編輯 .env 填入實際值
```

## 🚀 快速開始流程

### 1️⃣ 初次設定

```bash
# 1. 確保已安裝 Docker Desktop 和 VS Code Dev Containers 擴充套件
# 2. 在 VS Code 中開啟專案
# 3. 按 F1，選擇 "Dev Containers: Reopen in Container"
# 4. 等待容器建構完成（首次約 5-10 分鐘）
```

### 2️⃣ 環境驗證

```bash
# 執行環境檢查腳本
bash .devcontainer/check-environment.sh

# 或使用 VS Code 任務（Ctrl+Shift+P → "Tasks: Run Task" → "環境檢查"）
```

### 3️⃣ 開始開發

```bash
# 啟動開發伺服器
npm run dev

# 在瀏覽器訪問 http://localhost:5173
```

## 📋 VS Code 任務

在 `.vscode/tasks.json` 中預先定義了常用任務，可透過以下方式快速執行：

**方法一**：使用快捷鍵

- `Ctrl+Shift+B`：執行預設建構任務（啟動開發伺服器）
- `Ctrl+Shift+P` → "Tasks: Run Task"：選擇任務執行

**方法二**：使用指令面板

1. 按 `F1` 或 `Ctrl+Shift+P`
2. 輸入 `Tasks: Run Task`
3. 選擇要執行的任務

**可用任務**：

- 🚀 啟動開發伺服器
- 🧪 執行測試（API、單元、E2E、全部）
- 🔍 程式碼檢查
- ✨ 格式化程式碼
- 🔨 建構應用程式
- 🗄️ 資料庫操作（遷移、重設、Studio）
- 📧 Email Worker 管理
- 📬 郵件佇列管理
- ✅ 環境檢查

## 🔧 自訂設定

### 修改 VS Code 設定

編輯 `devcontainer.json` 的 `customizations.vscode.settings`：

```json
"customizations": {
  "vscode": {
    "settings": {
      "editor.tabSize": 2,
      // 你的自訂設定...
    }
  }
}
```

### 新增 VS Code 擴充套件

在 `devcontainer.json` 的 `extensions` 陣列中新增：

```json
"extensions": [
  "svelte.svelte-vscode",
  "your-publisher.your-extension"
]
```

### 修改容器配置

編輯 `docker-compose.devcontainer.yml` 或 `Dockerfile.devcontainer`，然後在 VS Code 中執行：

```
Dev Containers: Rebuild Container
```

## 🐛 常見問題

### Q: 容器無法啟動？

**A**: 檢查 Docker 是否執行，並查看日誌：

```bash
docker compose -f .devcontainer/docker-compose.devcontainer.yml logs
```

### Q: 資料庫連線失敗？

**A**: 確認資料庫容器健康狀態：

```bash
docker compose -f .devcontainer/docker-compose.devcontainer.yml ps
```

### Q: npm install 很慢？

**A**: 專案已使用 Docker volume 快取 `node_modules`，首次會慢一些，之後會快很多。

### Q: 如何重設環境？

**A**: 刪除 volume 並重新建構：

```bash
docker volume rm moa_devcontainer_node_modules moa_devcontainer_pgdata
# 然後在 VS Code: Dev Containers: Rebuild Container
```

## 📚 延伸閱讀

- [VS Code Dev Containers 官方文件](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container 規格](https://containers.dev/)
- [Docker Compose 文件](https://docs.docker.com/compose/)
- [專案主要 README](../README.md)
- [生產環境部署指南](../docs/PRODUCTION-DEPLOYMENT.md)
- [CI/CD 指南](../docs/CI-CD.md)

## 🤝 貢獻

如果你對 Dev Container 配置有改進建議，歡迎提交 Issue 或 Pull Request！

---

**快速導航**：

- 📖 [完整使用文件](README.md)
- ⚡ [快速啟動指南](QUICKSTART.md)
- 🔧 [詳細配置說明](CONFIGURATION.md)
- 🏠 [回到專案首頁](../README.md)
