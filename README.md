# MOA - 古董局中局桌遊輔助網站

[![CI](https://github.com/ppuff1988/moa/actions/workflows/ci.yml/badge.svg)](https://github.com/ppuff1988/moa/actions/workflows/ci.yml)
[![CD](https://github.com/ppuff1988/moa/actions/workflows/cd.yml/badge.svg)](https://github.com/ppuff1988/moa/actions/workflows/cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5-orange)](https://kit.svelte.dev/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://www.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/ppuff1988/moa/pulls)
[![GitHub issues](https://img.shields.io/github/issues/ppuff1988/moa)](https://github.com/ppuff1988/moa/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/ppuff1988/moa)](https://github.com/ppuff1988/moa/commits/main)

## 🎮 立即開始遊戲

🌐 **線上版本**: [https://moa.sportify.tw](https://moa.sportify.tw)

無需安裝，打開瀏覽器即可開始遊戲！

## 📖 關於本專案

本專案為「**古董局中局**」桌遊的線上版本。這是一個由愛好者自發開發的專案，起源於官方 App 停止更新後，許多玩家轉而使用微信小程序，但面臨以下問題：

- 🚫 部分地區用戶無法註冊微信帳號
- 🔐 不願意註冊微信或被隱私政策困擾
- 🌐 希望有更開放、更便利的遊玩方式
- 📱 順便試試看 Vibe Coding

因此，本專案採用現代 Web 技術重新打造，讓所有玩家都能輕鬆享受這款精彩的策略桌遊。

### 💡 專案目標

- ✨ **無障礙遊玩**：只需瀏覽器，無需下載 App 或註冊微信
- 🎮 **完整遊戲體驗**：還原桌遊的核心玩法與策略樂趣
- 🌍 **開放原始碼**：社群驅動，歡迎所有人貢獻與改進
- 🚀 **現代化技術**：快速、穩定、易於擴展

### 🙋 歡迎參與

這是一個由社群推動的專案，我們非常歡迎：

- 🐛 回報問題與 Bug
- 💡 提供功能建議
- 🔧 提交程式碼改進
- 📝 完善文件說明
- 🎨 優化使用者體驗

讓我們一起打造更好的遊戲體驗！

## ✨ 特色功能

- 🎮 即時多人遊戲
- 🎭 完整角色技能系統
- 🏺 獸首收集機制
- 🔐 安全身份驗證（Email/密碼 + Google OAuth）
- 📊 遊戲房間管理
- 💬 遊戲內聊天
- 🐳 支援 Docker 部署
- 🔑 一鍵 Google 登入

## 🚀 快速開始

### 遊戲玩法

想了解遊戲規則與玩法？請參考：

📖 **[遊戲規則說明](docs/RULE.md)**

## 🐳 簡易部署

### 使用 Docker Compose（推薦）

```bash
# 1. Clone 專案
git clone https://github.com/ppuff1988/moa.git
cd moa

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env 填入必要設定
```

#### 環境變數說明

複製 `.env.example` 後，請編輯 `.env` 檔案並設定以下必要參數：

**資料庫配置**

- `POSTGRES_USER`: 資料庫使用者名稱（預設: `moa_user`）
- `POSTGRES_PASSWORD`: 資料庫密碼（**請務必修改**）
- `POSTGRES_DB`: 資料庫名稱（預設: `moa_db`）
- `POSTGRES_HOST`: 資料庫主機（本地開發: `localhost`，Docker: `db`）
- `POSTGRES_PORT`: 資料庫埠號（預設: `5432`）

**應用程式配置**

- `NODE_ENV`: 執行環境（`development` / `production`）
- `PORT`: 應用程式埠號（預設: `5173`）
- `SOCKET_PORT`: WebSocket 埠號（預設: `5173`）

**JWT 配置**

- `JWT_SECRET`: JWT 密鑰（**請務必修改為複雜的隨機字串**）
- `JWT_EXPIRES_IN`: Token 有效期限（預設: `30d`）

**Google OAuth 配置（選用）**

如果想啟用 Google 一鍵登入功能，需要設定以下參數：

- `GOOGLE_CLIENT_ID`: Google OAuth 用戶端 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 用戶端密鑰
- `GOOGLE_REDIRECT_URI`: OAuth 回調網址（本地: `http://localhost:5173/auth/google/callback`）

> 📖 **詳細設定步驟**：請參考 [Google OAuth 快速開始指南](docs/GOOGLE-OAUTH-QUICKSTART.md)

**Docker Hub（生產部署用）**

- `DOCKER_USERNAME`: 你的 Docker Hub 使用者名稱

> ⚠️ **安全提醒**：在生產環境中，請務必修改 `POSTGRES_PASSWORD` 和 `JWT_SECRET` 為強密碼！

```bash
# 3. 啟動服務
docker-compose up -d

# 4. 查看服務狀態
docker-compose ps

# 5. 查看日誌
docker-compose logs -f
```

服務啟動後，訪問 http://localhost:5173 即可開始遊戲！

### 停止服務

```bash
docker-compose down
```

### 生產環境部署

詳細的生產環境部署步驟，請參考：

📖 **[生產環境部署指南](docs/PRODUCTION-DEPLOYMENT.md)**

## 🔄 CI/CD 自動化流程

本專案採用 GitHub Actions 實現完整的 CI/CD 流程，確保程式碼品質並自動部署到生產環境。

### 持續整合（CI）

當程式碼推送到 `main` 或 `develop` 分支時，會自動執行：

- ✅ **程式碼檢查**：ESLint + Prettier + TypeScript 類型檢查
- ✅ **API 測試**：完整的後端 API 測試
- ✅ **建置檢查**：確保應用程式可以成功建置
- ✅ **Docker 映像建置**：自動建置並推送到 Docker Hub（僅 main 分支）

### 持續部署（CD）

當 CI 測試通過後，會自動觸發部署流程：

- 🚀 **自動部署**：拉取最新 Docker 映像並部署到生產伺服器
- 🏥 **健康檢查**：自動驗證服務是否正常運行
- 💬 **Slack 通知**：即時通知部署結果（可選）

### 工作流程

```
Push to main
    ↓
🔍 CI: 測試 + 檢查 + 建置 Docker 映像
    ↓
✅ CI 通過
    ↓
🚀 CD: 自動部署到生產環境
    ↓
🏥 健康檢查
    ↓
✅ 部署完成
```

### 手動部署

除了自動部署，也可以在 GitHub Actions 頁面手動觸發部署。

詳細設定請參考：📖 **[CI/CD 設定指南](docs/CI-CD.md)**

## 📚 完整文件

- 📖 [遊戲規則說明](docs/RULE.md) - 遊戲玩法與規則
- 🗄️ [資料庫架構說明](docs/DATABASE-SCHEMA.md) - 資料庫表結構與管理方式
- 🚀 [生產環境部署](docs/PRODUCTION-DEPLOYMENT.md) - 部署到生產環境
- 🔄 [CI/CD 設定](docs/CI-CD.md) - 自動化流程設定
- 📧 [郵件隊列系統](docs/EMAIL-QUEUE-GUIDE.md) - 郵件服務與隊列管理（使用 pg-boss）
- 📱 [Telegram Bot 設定](docs/TELEGRAM-BOT-SETUP.md) - 設定部署通知機器人
- 🎨 [程式碼風格指南](docs/STYLE.md) - 開發規範

### 📧 關於郵件隊列系統

本專案使用 **pg-boss** 管理郵件發送隊列，所有郵件相關的資料表由 pg-boss 自動管理，您不需要手動創建任何 email queue 相關的表。

**重要說明**：

- ✅ pg-boss 會自動在您的 PostgreSQL 資料庫中創建所需的表（在 `pgboss` schema 下）
- ✅ 您的 `migrations/` 資料夾中不應包含 email queue 相關的 SQL
- ✅ 只需確保 `DATABASE_URL` 配置正確，pg-boss 會處理其他一切

詳細說明請參考：[郵件隊列系統完整指南](docs/EMAIL-QUEUE-GUIDE.md)

## 🤝 貢獻指南

我們歡迎各種形式的貢獻！

### 如何貢獻

1. **Fork** 本專案
2. 建立你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 **Pull Request**

### 回報問題

發現 Bug 或有建議？請到 [Issues](https://github.com/ppuff1988/moa/issues) 頁面回報：

- 🐛 **Bug 回報**：描述問題與重現步驟
- 💡 **功能建議**：說明你希望的功能
- ❓ **使用問題**：尋求幫助與支援

## 📝 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 文件

## 🙏 致謝

- 感謝所有貢獻者的付出
- 感謝「古董局中局」原作提供的精彩遊戲設計
- 感謝開源社群提供的優秀工具與框架

## ⚖️ 免責聲明

本專案為非營利的愛好者自發開發專案，旨在讓更多玩家能夠享受「古董局中局」桌遊的樂趣。

如有任何版權或智慧財產權相關問題，請透過以下方式聯繫我們，我們會立即處理：

📧 **聯絡信箱**: [GitHub Issues](https://github.com/ppuff1988/moa/issues)

## 📧 聯絡方式

- **問題回報**: [GitHub Issues](https://github.com/ppuff1988/moa/issues)
- **討論交流**: [GitHub Discussions](https://github.com/ppuff1988/moa/discussions)

---

⭐ 如果這個專案對你有幫助，請給我們一個 Star！

Made with ❤️ by MOA Community
