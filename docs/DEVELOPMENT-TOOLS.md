# 🛠️ 開發工具與腳本指南

本專案提供多種開發工具與腳本，幫助你更高效地進行開發、測試與部署。

## 📋 目錄

- [快速指令參考](#快速指令參考)
- [NPM Scripts](#npm-scripts)
- [Makefile 指令](#makefile-指令)
- [Shell 腳本](#shell-腳本)
- [VS Code Tasks](#vs-code-tasks)

## 🚀 快速指令參考

### 開發常用指令

```bash
# 啟動開發伺服器
npm run dev

# 執行測試
npm test

# 程式碼檢查
npm run lint

# 格式化程式碼
npm run format

# 建置應用程式
npm run build
```

### 使用 Makefile（推薦）

```bash
# 查看所有可用指令
make help

# 快速設定開發環境
make setup-dev

# 本地 CI 檢查
make ci-local

# 清理建置檔案
make clean

# 檢查開發環境
make check-env
```

## 📦 NPM Scripts

### 開發相關

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器（包含 Socket.IO） |
| `npm run dev:vite` | 僅啟動 Vite 開發伺服器 |
| `npm run build` | 建置應用程式 |
| `npm run preview` | 預覽建置結果 |
| `npm start` | 啟動生產環境伺服器 |

### 測試相關

| 指令 | 說明 |
|------|------|
| `npm test` | 執行所有測試（API + E2E） |
| `npm run test:unit` | 執行單元測試 |
| `npm run test:api` | 執行 API 測試 |
| `npm run test:api:watch` | 監聽模式執行 API 測試 |
| `npm run test:api:coverage` | 產生測試覆蓋率報告 |
| `npm run test:e2e` | 執行 E2E 測試 |

### 程式碼品質

| 指令 | 說明 |
|------|------|
| `npm run lint` | 執行程式碼檢查（Prettier + ESLint） |
| `npm run format` | 格式化程式碼 |
| `npm run check` | TypeScript 類型檢查 |
| `npm run check:watch` | 監聽模式類型檢查 |

### 資料庫相關

| 指令 | 說明 |
|------|------|
| `npm run db:start` | 啟動資料庫（Docker Compose） |
| `npm run db:migrate` | 執行資料庫遷移 |
| `npm run db:reset` | 重置資料庫 |
| `npm run db:studio` | 開啟 Drizzle Studio |

### 郵件隊列

| 指令 | 說明 |
|------|------|
| `npm run worker:email` | 啟動郵件 Worker（開發模式） |
| `npm run queue:status` | 查看郵件佇列狀態 |
| `npm run queue:retry` | 重試失敗的郵件 |
| `npm run queue:clear` | 清空郵件佇列 |

## 🔧 Makefile 指令

Makefile 提供更高層級的指令，適合組合多個操作。

### 可用指令

```bash
make help              # 顯示所有可用指令
make setup-dev         # 快速設定開發環境
make ci-local          # 本地 CI 檢查（lint + test + build）
make clean             # 清理建置檔案與快取
make check-env         # 檢查開發環境配置
make docker-prod-up    # 啟動生產環境
make docker-prod-down  # 停止生產環境
```

### 詳細說明

#### `make setup-dev`

快速設定開發環境，包含：

1. 安裝 NPM 相依套件
2. 安裝 Git hooks
3. 執行資料庫遷移

```bash
make setup-dev
```

#### `make ci-local`

在本地模擬 CI 流程，依序執行：

1. 程式碼檢查（Lint）
2. 類型檢查
3. 測試（API + E2E）
4. 建置

```bash
make ci-local
```

適合在推送程式碼前執行，確保能通過 CI 檢查。

#### `make check-env`

檢查開發環境是否正確配置：

- Node.js、npm、Git 版本
- NPM 套件安裝狀態
- 環境變數設定
- 資料庫連線狀態
- Git 配置

```bash
make check-env
```

## 📜 Shell 腳本

### Git Hooks 安裝

**檔案**：`install-hooks.sh`

安裝 Git hooks 到 `.git/hooks/` 目錄：

```bash
bash install-hooks.sh
```

> 💡 執行 `npm install` 時會自動執行

### 環境檢查

**檔案**：`.devcontainer/check-environment.sh`

檢查 Dev Container 環境配置：

```bash
bash .devcontainer/check-environment.sh
```

或使用 Makefile：

```bash
make check-env
```

### 生產環境部署

**檔案**：`deploy-prod.sh`

啟動生產環境 Docker 容器：

```bash
bash deploy-prod.sh
```

或使用 Makefile：

```bash
make docker-prod-up
```

**檔案**：`down-prod.sh`

停止生產環境 Docker 容器：

```bash
bash down-prod.sh
```

或使用 Makefile：

```bash
make docker-prod-down
```

## 🎯 VS Code Tasks

在 Dev Container 中，可以使用 VS Code 的 Tasks 快速執行常用指令。

按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`），輸入 `Tasks: Run Task`，選擇：

- 🚀 啟動開發伺服器
- 🧪 執行 API 測試
- 🧪 執行單元測試
- 🧪 執行 E2E 測試
- 🧪 執行所有測試
- 📊 測試覆蓋率報告
- 🔍 程式碼檢查 (Lint)
- ✨ 格式化程式碼
- 🔨 建構應用程式
- 📦 安裝相依套件
- 🗄️ 資料庫遷移
- 🗄️ 重設資料庫
- 🗄️ 開啟 Drizzle Studio
- 📧 啟動 Email Worker
- 📬 檢視郵件佇列狀態
- 🔄 重試失敗的郵件
- 🧹 清空郵件佇列
- ✅ 環境檢查
- 🐳 重新啟動資料庫

或使用快捷鍵 `Ctrl+Shift+B`（Mac: `Cmd+Shift+B`）執行預設建置任務。

## 🔄 Git Hooks

專案使用原生 Git hooks 進行程式碼品質檢查：

### Pre-commit Hook

在提交前自動執行：

- Prettier 格式化
- ESLint 檢查（僅針對 staged 檔案）

### Pre-push Hook

在推送前自動執行：

- TypeScript 類型檢查
- 完整 Lint 檢查
- 單元測試
- API 測試

### 繞過 Hooks

緊急情況下可以使用 `--no-verify` 繞過檢查：

```bash
git commit --no-verify -m "緊急修復"
git push --no-verify
```

> ⚠️ 請謹慎使用，確保不會破壞程式碼品質

## 💡 最佳實踐

### 開發工作流程

1. **啟動開發環境**

   ```bash
   # 使用 Dev Container（推薦）
   # 在 VS Code 中開啟專案，按 F1 → "Dev Containers: Reopen in Container"
   
   # 或手動設定
   make setup-dev
   ```

2. **開始開發**

   ```bash
   npm run dev
   # 或使用 VS Code Task: 🚀 啟動開發伺服器
   ```

3. **程式碼檢查**

   ```bash
   npm run lint
   npm run check
   ```

4. **執行測試**

   ```bash
   npm test
   ```

5. **提交前檢查**

   ```bash
   make ci-local
   ```

6. **提交程式碼**

   ```bash
   git add .
   git commit -m "feat: 新增功能"
   # Git hooks 會自動執行檢查
   ```

### 生產環境部署

```bash
# 1. 設定環境變數
cp .env.example .env
# 編輯 .env

# 2. 啟動生產環境
make docker-prod-up

# 3. 查看狀態
docker compose -f docker-compose.prod.yml ps

# 4. 查看日誌
docker compose -f docker-compose.prod.yml logs -f

# 5. 停止服務
make docker-prod-down
```

## 🐛 故障排除

### Git Hooks 未執行

```bash
# 重新安裝 hooks
bash install-hooks.sh
```

### 資料庫連線失敗

```bash
# 檢查資料庫是否啟動
docker compose ps

# 重新啟動資料庫
npm run db:start

# 或在 VS Code 中使用 Task: 🐳 重新啟動資料庫
```

### 建置失敗

```bash
# 清理快取
make clean

# 重新安裝相依套件
rm -rf node_modules package-lock.json
npm install

# 重新建置
npm run build
```

## 📚 相關文件

- [開發規範文檔](.github/instructions/) - Copilot 指導文檔
- [Dev Container 使用指南](.devcontainer/README.md)
- [工作流程說明](docs/WORKFLOWS.md)
- [CI/CD 設定](docs/CI-CD.md)

---

💡 **提示**：在 Dev Container 環境中，建議優先使用 Makefile 和 VS Code Tasks，可以獲得更好的開發體驗！
