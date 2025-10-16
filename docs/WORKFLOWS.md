# 工作流程文檔

本文檔說明 MOA 專案的開發工作流程、分支策略、Git Hooks 和自動化流程（已與目前的 GitHub Actions 設定完全對齊）。

## 📋 目錄

- [分支策略](#分支策略)
- [開發工作流程](#開發工作流程)
- [Git Hooks](#git-hooks)
- [自動化流程](#自動化流程)
- [Commit 訊息規範](#commit-訊息規範)
- [Pull Request 流程](#pull-request-流程)
- [Code Review 指南](#code-review-指南)
- [發布流程](#發布流程)
- [前置設定與注意事項](#前置設定與注意事項)

## 🌳 分支策略

本專案採用類 Git Flow 的分支模型（實際整合分支為 `dev`）：

```
main (生產環境)
  ↑
dev (開發整合)
  ↑
feature/* (功能分支)
hotfix/* (緊急修復)
release/* (發布分支，可選)
```

### 分支說明

#### `main` 分支

- 用途: 生產環境程式碼
- 保護: 受保護分支，需要 PR 與審核（依據你在 GitHub 的 Branch protection 規則）
- 部署: 合併後自動部署到生產環境（見 CD）
- 重要: 不可直接推送，必須透過 PR

#### `dev` 分支

- 用途: 開發整合
- 保護: 建議受保護分支（視團隊規範）
- 部署: 視需要可對接測試環境（目前 workflows 未設置自動部署到測試環境）
- 重要: 不可直接推送，透過 PR；符合條件時會自動合併（見 Auto-merge Dev）

#### `feature/*` 分支

- 用途: 新功能開發
- 來源: 從 `dev` 建立
- 合併: 合併回 `dev`
- 命名規則: `feature/功能描述`

#### `hotfix/*` 分支

- 用途: 緊急修復生產環境問題
- 來源: 從 `main` 建立
- 合併: 合併回 `main`，並自動建立同步到 `dev` 的 PR
- 命名規則: `hotfix/問題描述`

#### `release/*` 分支（可選）

- 用途: 準備新版本發布
- 來源: 從 `dev` 建立
- 合併: 視流程合併到 `main` 與 `dev`
- 命名規則: `release/版本號`

## 🔄 開發工作流程

### 標準開發流程

1. 開始新功能開發
   - 從 `dev` 建立 `feature/*` 分支
   - 分支命名遵循 `feature/功能描述`
2. 提交變更
   - 提交時會觸發 pre-commit hooks（格式化、ESLint 等）
   - 使用 Conventional Commits 格式
3. 推送到遠端
   - 推送前觸發 pre-push hooks（typecheck、lint、單元測試、API 測試）
4. 創建 Pull Request
   - PR 目標通常為 `dev`
   - 填寫完整描述、連結 Issue、指定審核者
5. 等待 CI 與審核
   - GitHub Actions 會執行 `CI Test`
   - 解決 Review 意見、確保無合併衝突
6. 合併與清理
   - PR 批准後合併（或由 Auto-merge Dev 自動合併）
   - 刪除已合併分支

## 🪝 Git Hooks

本專案使用 Husky 管理 Git hooks，在提交與推送時自動執行品質檢查。

- Pre-commit: Prettier 格式化、ESLint 檢查（僅針對 staged 檔）
- Pre-push: TypeScript 類型檢查、完整 Lint、單元測試、API 測試
- 繞過 Hooks（僅緊急）: `--no-verify`
- 若 hooks 未生效: `npm run prepare`

## 🤖 自動化流程

以下說明與實際 workflow 檔案對應：

- `CI Test` → `.github/workflows/ci-test.yml`
- `Auto Merge Hotfix` → `.github/workflows/auto-merge-hotfix.yml`
- `Auto Merge to Dev` → `.github/workflows/auto-merge-dev.yml`
- `Auto Version Bump` → `.github/workflows/auto-version.yml`
- `CI Release` → `.github/workflows/ci-release.yml`
- `CD` → `.github/workflows/cd.yml`

### CI Test

- 觸發條件:
  - pull_request 到 `dev` 或 `main`
  - push 到 `dev`
- 內容：lint、型別檢查、啟動測試 DB → 建置 → 啟動測試伺服器 → API 測試
- 注意：PR 或 commit 訊息若包含 `[skip ci]` 或 `[ci skip]`，GitHub 會跳過 CI

### Auto-merge Dev Workflow（自動合併到 dev）

- 觸發條件：`workflow_run` of `CI Test`，且事件來源為 `pull_request`
- 合併條件（由 workflow 判斷）：
  - PR 目標分支為 `dev`
  - PR 非 draft
  - PR `mergeable_state` 為 `clean` 或 `unstable`（可合併）
- 行為：
  - 直接 `squash` 合併到 `dev`
  - 嘗試刪除來源分支（排除保護分支，如 `main`、`dev`）
  - 若發現 `mergeable_state: dirty`（衝突），會建立補救 PR 並加上 `merge-conflict` 標籤
- 備註：審核人數、必須通過的檢查等「規則」建議由 Branch protection 管理，本 workflow 不另行強制檢查審核數

### Auto-merge Hotfix Workflow（緊急修復）

- 觸發條件：`workflow_run` of `CI Test`，且事件來源為 `pull_request`
- 合併條件：
  - PR 來源分支以 `hotfix/` 開頭
  - PR 目標分支為 `main`
  - PR 非 draft
  - PR `mergeable_state` 為 `clean` 或 `unstable`
- 行為：
  - 自動 `squash` 合併到 `main`
  - 自動建立同步到 `dev` 的 PR，並加入 `hotfix`、`auto-sync` 標籤
  - 若同步 PR 建立失敗且顯示已存在（422），會嘗試刪除 `hotfix/*` 分支

### Auto-version Workflow（自動升版）

- 觸發條件：
  - PR 關閉（closed）且已合併，目標為 `main`
  - 或 `Auto Merge Hotfix` 完成（`workflow_run` 成功）
- 行為：
  - 分析自上個 tag 以來的 commit 訊息（遵循 Conventional Commits）
  - 決定 `major` / `minor` / `patch`，以 `npm version` 升版（不打 tag）
  - 建立升版 commit（不包含 `[skip ci]`），push 到 `main`
  - 建立並 push tag（`vX.Y.Z`）
  - 將升版 commit cherry-pick 同步到 `dev`（從 `main` 的釋出 commit 取 SHA 再切 `dev` cherry-pick）
- 備註：若沒有符合規則的 commit，會跳過升版

### CI Release（建置與發布）

- 觸發條件：
  - push 到 `main`（注意：若由 GITHUB_TOKEN 觸發，GitHub 可能不再連鎖觸發其他 workflow）
  - 或 `Auto Version Bump` 完成（`workflow_run`）
  - 或手動觸發（`workflow_dispatch`）
- 行為：
  - 讀取 `package.json` 版本，建置並推送 Docker 映像（`latest`、`vX.Y.Z`、`${{ github.sha }}`）
  - 若檢查到該版本 tag 尚未存在，建立 git tag 並 push
  - 產生 Release Notes（從上一個版本 tag 至 HEAD 的 commits）並建立 GitHub Release
  - 發送 Telegram 通知

### CD（部署到生產環境）

- 觸發條件：
  - `workflow_run` of `CI Release` 完成且來源分支為 `main`
  - 或手動觸發（`workflow_dispatch`）
- 行為：
  - 以 SSH 方式登入目標主機，更新 `.env` 後執行 `deploy-prod.sh`
  - 進行健康檢查（`/api/health`）
  - 成功或失敗皆會發送 Telegram 通知

## 📝 Commit 訊息規範

本專案遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範。

格式：

```
<類型>[可選的範圍]: <描述>

[可選的正文]

[可選的頁腳]
```

常見類型：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`

- 若有不相容變更，請在訊息中加入 `BREAKING CHANGE:` 或在類型後加上 `!`

## 🔍 Pull Request 流程

- PR 標題應遵循 Conventional Commits 格式
- PR 描述應包含變更說明、相關 Issue、變更類型、檢查清單、測試說明、必要截圖
- PR 審核流程：
  1. 創建 PR
  2. 自動檢查（CI 需通過）
  3. 人工審核（審核規則由 Branch protection 定義）
  4. 合併：功能分支建議使用 "Squash and merge"

## 👀 Code Review 指南

檢查項目（節選）：

- 程式碼品質：易讀、命名清晰、無重複、符合規範
- 功能正確性：符合需求、邏輯正確、邊界條件完善
- 測試：覆蓋足夠、案例合理、可通過
- 安全性：資料保護、避免注入、權限檢查
- 效能：查詢與資源使用合理
- 文檔：README/API/註釋更新

## 🚦 發布流程

推薦標準流程：

1. 從 `dev`（或 `release/*`）建立 PR 到 `main`
2. 等待 CI 通過與審核
3. 合併到 `main`
4. 自動化鏈：
   - Auto-version 分析 commits → 升版 → 建立 tag → 同步到 `dev`
   - CI Release 建置/推送 Docker、（如需）建立 tag 與 GitHub Release
   - CD 自動部署到生產

## 🔧 前置設定與注意事項

- GitHub Actions 權限（必要）：
  - Repository → Settings → Actions → General → Workflow permissions
  - 勾選「Read and write permissions」，並建議勾選「Allow GitHub Actions to create and approve pull requests」
- Secrets/Variables：
  - Docker：`DOCKER_USERNAME`、`DOCKER_PASSWORD`
  - 部署：`DEPLOY_HOST`（Secret/Var 視情況）、`DEPLOY_SSH_KEY`（Secret）、`DEPLOY_USER`（Var）、`DEPLOY_PORT`（Var，預設 22）、`DEPLOY_PATH`（Var）、`DEPLOY_URL`（Var）
  - App：`DATABASE_URL`（Secret）、`JWT_SECRET`（Secret）、`POSTGRES_*`（Var/Secret）、`PUBLIC_GTM_ID`（Var）
  - 通知：`TELEGRAM_BOT_TOKEN`（Secret）、`TELEGRAM_CHAT_ID`（Secret）
- 關於 GITHUB_TOKEN：
  - 由 workflow 以 GITHUB_TOKEN 觸發的 push 事件，預設不一定會再觸發其他 workflows
  - 本專案已透過 `workflow_run` 串接 Auto-version → CI Release → CD，以避免鏈條中斷
- 避免使用 `[skip ci]` / `[ci skip]`：
  - 這會讓 PR 的 `CI Test` 不執行，導致 `auto-merge-dev` 不會啟動

---

最後更新: 2025-10-16
