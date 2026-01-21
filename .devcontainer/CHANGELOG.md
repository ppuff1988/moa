# Dev Container 設定變更記錄

## [1.0.0] - 2026-01-21

### ✨ 新增功能

#### 核心配置

- ✅ 建立完整的 VS Code Dev Container 配置
- ✅ 支援 Docker Compose 多服務架構
- ✅ 自動化環境設定和初始化
- ✅ 一鍵啟動完整開發環境

#### 服務配置

- ✅ **主要應用程式容器**（Node.js 22 + 完整開發工具）
- ✅ **PostgreSQL 16 資料庫**（自動初始化和遷移）
- ✅ **Email Worker**（選擇性啟動）
- ✅ 使用 Docker Volume 最佳化效能

#### VS Code 整合

- ✅ 預先安裝 15+ 個推薦擴充套件
  - Svelte、TypeScript、ESLint、Prettier
  - SQLTools、Vitest、Playwright
  - GitLens、Docker 等
- ✅ 預設編輯器設定（格式化、Lint、Tab 設定等）
- ✅ SQLTools 預設資料庫連線配置
- ✅ 連接埠自動轉發（5173、5432）

#### 開發工具

- ✅ Git、GitHub CLI
- ✅ PostgreSQL Client
- ✅ Zsh + oh-my-zsh
- ✅ Vim、Nano 編輯器
- ✅ Chromium、Firefox、WebKit（供 Playwright）
- ✅ Sudo 權限支援

#### 文件與指南

- ✅ **README.md**：完整使用文件（疑難排解、資料庫連線等）
- ✅ **QUICKSTART.md**：5 分鐘快速啟動指南
- ✅ **CONFIGURATION.md**：詳細配置說明和最佳化技巧
- ✅ **INDEX.md**：結構總覽和快速導航

#### 工具腳本

- ✅ **check-environment.sh**：Bash 環境檢查腳本
- ✅ **check-environment.ps1**：PowerShell 環境檢查腳本
- ✅ 自動檢查系統工具、套件、環境變數、資料庫連線

#### VS Code 任務

- ✅ 預先定義 20+ 個常用任務
- ✅ 快速執行開發伺服器、測試、Lint 等
- ✅ 資料庫管理任務（遷移、重設、Studio）
- ✅ Email Worker 和郵件佇列管理任務

#### 範例檔案

- ✅ **.env.devcontainer.example**：完整環境變數範例
- ✅ 包含資料庫、JWT、SMTP、OAuth 等所有設定

#### 專案整合

- ✅ 更新主 README.md，新增 Dev Container 說明
- ✅ 與現有 Docker 設定完全相容
- ✅ 支援現有的開發工作流程

### 🎯 使用者體驗改進

#### 自動化

- 🤖 容器建立時自動執行 `npm install` 和資料庫遷移
- 🤖 容器啟動時自動設定 Git 安全目錄
- 🤖 健康檢查確保服務正常運行

#### 效能最佳化

- ⚡ 使用 Docker Volume 快取 `node_modules`
- ⚡ 使用 `:cached` 模式掛載專案資料夾
- ⚡ 最佳化 Docker 層快取
- ⚡ 支援跨平台建構（Windows、Mac、Linux）

#### 開發體驗

- 💡 智慧的 VS Code 設定（格式化、Lint、錯誤提示）
- 💡 預先配置好的資料庫連線（SQLTools）
- 💡 快速任務執行（Ctrl+Shift+B）
- 💡 完整的中文文件和註解

### 📚 文件改進

- 📖 新增詳細的 Dev Container 使用指南
- 📖 新增快速啟動流程（5 分鐘上手）
- 📖 新增疑難排解指南（涵蓋常見問題）
- 📖 新增配置檔案詳解
- 📖 新增效能最佳化建議
- 📖 主 README.md 新增 Dev Container 章節

### 🔧 技術細節

#### Docker 配置

- 使用 Node.js 22 Alpine 作為基礎映像
- 多階段建置最佳化映像大小
- 使用 `init: true` 適當處理訊號
- 健康檢查確保服務可用性

#### Volume 管理

- `moa_devcontainer_node_modules`：快取 Node.js 套件
- `moa_devcontainer_pgdata`：持久化資料庫資料
- 命名規範清晰，避免衝突

#### 網路配置

- 自訂網路 `moa_devcontainer_network`
- 服務間可透過服務名稱互相連線
- 連接埠轉發支援本機訪問

### 🎨 使用者介面

- 使用 emoji 增強可讀性
- 清晰的區段分隔
- 程式碼區塊語法高亮
- 表格化比較資訊
- 顏色編碼（腳本輸出）

### 🔒 安全性

- 非 root 使用者執行（node 使用者）
- 環境變數檔案使用 `:ro` 唯讀掛載
- .gitconfig 唯讀掛載
- 範例檔案提醒修改敏感資訊

### 📦 檔案結構

```
.devcontainer/
├── devcontainer.json                 # 主配置
├── docker-compose.devcontainer.yml   # 服務定義
├── Dockerfile.devcontainer           # 開發映像
├── README.md                         # 使用指南
├── QUICKSTART.md                     # 快速開始
├── CONFIGURATION.md                  # 配置詳解
├── INDEX.md                          # 結構總覽
├── CHANGELOG.md                      # 本檔案
├── check-environment.sh              # Bash 檢查腳本
└── check-environment.ps1             # PowerShell 檢查腳本

.vscode/
└── tasks.json                        # VS Code 任務定義

（專案根目錄）
├── .env.devcontainer.example         # 環境變數範例
└── README.md                         # 更新：新增 Dev Container 章節
```

### 🚀 下一步計畫

未來可能的改進：

- [ ] 新增 Dev Container Features 支援
- [ ] 新增更多預設任務（建構、發佈等）
- [ ] 整合 VS Code 偵錯配置
- [ ] 新增 Docker Compose profiles 支援更多服務
- [ ] 新增自動化測試覆蓋率視覺化
- [ ] 整合 Git hooks 到容器環境

### 📝 注意事項

1. **首次啟動時間**：約 5-10 分鐘（下載映像、安裝套件）
2. **系統需求**：建議至少 4GB RAM、2 CPU 核心
3. **磁碟空間**：約需 5GB 可用空間
4. **網路需求**：需要網路連線下載映像和套件

### 🙏 致謝

感謝所有參與測試和提供回饋的開發者！

---

**版本規範**：本專案遵循[語意化版本](https://semver.org/lang/zh-TW/)。
