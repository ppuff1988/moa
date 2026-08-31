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

本專案使用原生 Git hooks 管理，在提交與推送時自動執行品質檢查。

- **安裝 Hooks**: 執行 `npm install` 或手動執行 `bash install-hooks.sh`（Windows 使用 `install-hooks.ps1`）
- **Pre-commit**: Prettier 格式化、ESLint 檢查（僅針對 staged 檔）
- **Pre-push**: TypeScript 類型檢查、完整 Lint、單元測試、API 測試
- **繞過 Hooks**（僅緊急）: 使用 `--no-verify` 參數
- **Hooks 位置**: `.githooks/` 目錄（會在安裝時複製到 `.git/hooks/`）

## 🤖 自動化流程

以下說明與實際 workflow 檔案對應：

- `CI Test`：PR 的 lint、型別、單元、API 與 Playwright smoke 測試。完整 8 人三回合 E2E 不在每次 CI 執行。
- `Auto Merge to Dev`：確認 CI SHA 與無 finding 的 Codex Review 都對應目前 PR SHA。一般 PR 使用 squash；`main → dev` 使用 Merge commit。
- `Prepare Release`：只接受 repository owner 從受保護的 `main` 手動執行，把 `auto`／`patch`／`minor`／`major` 保存為帶有 `release-request` 標籤的 Issue，再喚醒版本協調器。請求會綁定原始 workflow run，且不依賴 Actions pending run，因此不會在 concurrency 取代 pending run 時遺失。
- `Auto Version Bump`：是唯一的版本協調器。PR lifecycle 使用 `pull_request_target`，讓具寫入權限的 PAT 只由 base branch 上的可信 workflow 定義存取；協調器不執行 PR scripts，並以固定 commit SHA、隔離 npm 設定及 `--ignore-scripts` 處理版本檔。每次都從 repository state 重建佇列，ready Hotfix 可搶占進行中的 Release PR；協調器會先驗證完整信任鏈、重新開啟原 durable request，再關閉 PR 並移除舊 Release branch。否則處理最早且能驗證 owner、`main` 與原始 workflow run 的 Release request；確認 `dev` 已包含最新 `main` 且來源 SHA 未變後，才配置版本並建立 `release/vX.Y.Z` PR。版本協調器會先在 request Issue 留下精確的 Release commit SHA，再建立 PR 與完成標記；中斷恢復時也只接受同一個 SHA。
- `Auto Merge Release`／`Auto Merge Hotfix`：在目前 SHA 通過 CI 與 Codex Review 後，使用 Merge commit 合併到 `main`。Release PR 另須由 repository owner 在本 repository 建立，並同時通過 workflow run、request Issue、準備 commit SHA 與完成標記驗證。
- `Sync Main to Dev`：版本 PR 合併後建立同步 PR；仍需通過 CI 與 Codex gate，不會在建立時直接啟用 auto-merge。
- `CI Release`：從已合併 PR 重建未完成發布佇列，固定 merge commit 建置版本化 image、驗證 tag、等待部署，再建立 GitHub Release 作為完成標記。
- `CD`：可由 CI Release 呼叫，或從 `main` 手動指定已發布版本。tag、package 版本、完整 SHA、遠端 checkout 與 App／Worker image 必須一致；每次部署重試前都會重傳本次目標 `.env`，避免前一次 rollback 設定讓舊版被誤報為部署成功。

Ruleset 另外要求 PR、`lint`、`test-api` 與 conversation resolution。Workflow gate 同時綁定 CI 的 head SHA、base SHA 與 base ref；Codex 等待期間若 PR 關閉、轉為 draft、被 retarget，或任一 SHA 改變，都必須停止或重新執行 CI／Review，也不接受 `mergeable_state: unstable`。自動合併 concurrency 使用 PR number（沒有關聯 PR 時才退回 run ID），避免不同 fork 或不同目標的同名分支互相取消。

發布與部署採狀態重建而非把 concurrency 當 FIFO。GitHub 若取代 pending event，後續 scanner 仍會找到最舊的未完成版本；`main → dev` 合併使用 automation PAT，讓同步後的 `dev` push 能重新喚醒等待中的版本請求。migration 執行期間保留舊服務；部署會在 pull 新 image 前以運行中容器的 immutable image ID 建立 rollback tag。服務切換開始後的任何錯誤（包含 `compose up` 部分失敗）都會立即嘗試主動 rollback；所有部署失敗也會把 `.env` 的 App／Worker image 持久化回 rollback tag 並保留該 tag，避免後續 `compose up` 再次啟動失敗版本。只有部署成功才清除 rollback tag。migration 必須保持向後相容。

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

1. 在 `Prepare Release` 選擇 `auto`（或明確 major/minor/patch），系統會建立可追蹤的 Release request Issue
2. 等待版本協調器依序建立 `release/vX.Y.Z` PR，以及該 PR 的 CI 與 Codex Review 通過
3. 以 Merge commit 合併到 `main`
4. 自動化鏈：
   - CI Release 建置版本 image → 驗證 tag → 呼叫 CD → 建立 GitHub Release
   - Sync Main to Dev 建立同步 PR，經 CI／Codex gate 後 Merge 回 `dev`

## 🔧 前置設定與注意事項

- GitHub Actions 權限（必要）：
  - Repository → Settings → Actions → General → Workflow permissions
  - 勾選「Read and write permissions」，並建議勾選「Allow GitHub Actions to create and approve pull requests」
- Secrets/Variables：
  - Docker：`DOCKER_USERNAME`、`DOCKER_PASSWORD`
  - 部署：`DEPLOY_HOST`、`DEPLOY_SSH_KEY`、`DEPLOY_SSH_KNOWN_HOSTS`（Secrets），以及 `DEPLOY_USER`、`DEPLOY_PATH`、`DEPLOY_URL`（Variables）
  - App：`DATABASE_URL`（Secret）、`JWT_SECRET`（Secret）、`POSTGRES_*`（Var/Secret）、`PUBLIC_GTM_ID`（Var）
  - 通知：`TELEGRAM_BOT_TOKEN`（Secret）、`TELEGRAM_CHAT_ID`（Secret）
- 自動建立分支／PR 與自我 dispatch 使用 `PAT`，確保後續 workflow 會被觸發
- 避免使用 `[skip ci]` / `[ci skip]`：
  - 這會讓 PR 的 `CI Test` 不執行，導致 `auto-merge-dev` 不會啟動

---

最後更新: 2026-09-01
