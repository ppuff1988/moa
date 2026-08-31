# CI/CD 設定指南

本專案使用 GitHub Actions 實現自動化 CI/CD 流程。

## 📋 目錄

- [CI 流程](#ci-流程)
- [CD 流程](#cd-流程)
- [環境變數設定](#環境變數設定)
- [部署步驟](#部署步驟)
- [手動觸發部署](#手動觸發部署)
- [安全最佳實踐](#安全最佳實踐)

## 🔄 CI 流程

當 Pull Request 指向 `dev` 或 `main` 時，會自動執行以下檢查：

### 1. 程式碼檢查 (Lint)

- ESLint 程式碼品質檢查
- Prettier 程式碼格式檢查
- TypeScript 類型檢查

### 2. 單元測試

- 執行 Vitest 單元測試
- 確保所有單元測試通過

### 3. API 測試

- 使用 PostgreSQL 服務
- 執行所有 API 端點測試
- 驗證後端功能

### 4. E2E Smoke 測試

- 使用 Playwright 執行快速瀏覽器 smoke 測試
- 完整 8 人三回合流程保留為本機／人工驗證，避免拖慢每個 PR

### 5. 建置檢查

- 確保應用程式可以成功建置
- 驗證 Docker 映像可以正確建置

## 🚀 CD 流程

當版本化 Release／Hotfix PR 合併到 `main` 後，會依序執行發布與部署：

Release 與 Hotfix 共用版本配置鎖。建立 Release 前會確認 `dev` 已包含最新 `main`，Hotfix 則會等待進行中的 Release 完成，避免兩個 PR 配置到相同版本。

### 部署步驟

1. **建置 Docker 映像**
   - 建立多架構支援的映像
   - 推送到 Docker Hub
   - 標記為 `latest`、`vX.Y.Z` 和完整 commit SHA

2. **部署到伺服器**
   - 透過 SSH 連接到部署伺服器
   - 驗證 tag、package 版本與 SHA 一致
   - checkout 指定 SHA，拉取版本化 App／Worker image
   - 自動執行資料庫遷移

3. **健康檢查**
   - 等待服務啟動
   - 檢查 `/api/health` 端點
   - 確保服務正常運行

4. **通知**
   - 發送部署結果到 Telegram

## 🔐 環境變數設定

### GitHub Secrets 設定

在 GitHub 專案中需要設定兩種類型的配置：

> **💡 重要概念**：
>
> - **Variables（變數）**：公開資訊，可在日誌中顯示
> - **Secrets（密鑰）**：敏感資訊，在日誌中會被遮蔽為 `***`
> - 本專案使用預設值機制：即使不設定 Secrets，CI 也能運行（但不安全）

---

#### 📦 Repository 級別配置

這些配置適用於所有 workflow 和環境。

##### Variables（公開變數）

**設定位置**：Settings > Secrets and variables > Actions > Variables

這些是不敏感的資訊，可以在日誌中顯示：

```
DOCKER_USERNAME       # Docker Hub 使用者名稱（公開資訊）
```

**設定步驟**：

1. 前往 GitHub 專案頁面
2. 點擊 **Settings** > **Secrets and variables** > **Actions**
3. 切換到 **Variables** 頁籤
4. 點擊 **New repository variable**
5. 輸入名稱和值，點擊 **Add variable**

##### Secrets（密鑰）

**設定位置**：Settings > Secrets and variables > Actions > Secrets

這些是敏感資訊，會在日誌中被遮蔽：

**Docker Hub 憑證（用於 CD 部署）**

```
DOCKER_PASSWORD       # Docker Hub 密碼或存取令牌（建議使用 Access Token）
```

**測試環境資料庫憑證（用於 CI 測試）**

```
TEST_DB_USER          # 測試資料庫使用者名稱（預設：moa_test_user）
TEST_DB_PASSWORD      # 測試資料庫密碼（預設：moa_test_pass，建議自訂強密碼）
TEST_DB_NAME          # 測試資料庫名稱（預設：moa_test_db）
```

> **⚠️ 關於測試資料庫 Secrets**：
>
> 這些 Secrets 使用了**預設值機制**（fallback）：
>
> - ✅ 如果設定了 Secret，CI 會使用你設定的值
> - ⚠️ 如果未設定，CI 會使用預設值（`moa_test_user` / `moa_test_pass` / `moa_test_db`）
> - 🔒 **強烈建議設定自訂的強密碼**，避免使用預設值
>
> 預設值機制的好處：
>
> - 向後兼容：即使未設定 Secrets，CI 也能正常運行
> - 彈性配置：可根據需要自訂測試環境配置
> - 開發友善：新加入的開發者不會因為缺少 Secrets 而無法跑 CI

**設定步驟**：

1. 前往 GitHub 專案頁面
2. 點擊 **Settings** > **Secrets and variables** > **Actions**
3. 確保在 **Secrets** 頁籤（預設）
4. 點擊 **New repository secret**
5. 輸入名稱和值，點擊 **Add secret**
6. 依序新增所有需要的 Secrets

---

#### 🤔 如何選擇 Variables vs Secrets？

在設定 GitHub Actions 配置前，請參考以下決策指南：

##### 📊 決策流程圖

```
這個資訊是否敏感？
    ├─ 是（密碼、Token、私鑰等）
    │   └─ 使用 Secret ✅
    │
    └─ 否（主機名稱、使用者名稱、路徑等）
        └─ 使用 Variable ✅

這個配置是否所有環境都相同？
    ├─ 是（Docker Hub 帳號、測試資料庫等）
    │   └─ 使用 Repository 級別 ✅
    │
    └─ 否（生產/測試環境的主機、資料庫等）
        └─ 使用 Environment 級別 ✅
```

##### 🔍 實際範例對照表

| 資訊類型              | 範例值                     | 類型     | 級別        | 原因                       |
| --------------------- | -------------------------- | -------- | ----------- | -------------------------- |
| Docker Hub 使用者名稱 | `myusername`               | Variable | Repository  | 公開資訊，所有環境相同     |
| Docker Hub 密碼/Token | `ghp_xxxxx`                | Secret   | Repository  | 敏感資訊，所有環境相同     |
| 測試資料庫密碼        | `test_pass_123`            | Secret   | Repository  | 敏感資訊，僅測試用         |
| 生產伺服器 IP         | `54.123.45.67`             | Variable | Environment | 公開資訊，但不同環境不同   |
| 生產伺服器 SSH 私鑰   | `-----BEGIN...`            | Secret   | Environment | 敏感資訊，不同環境不同     |
| 部署路徑              | `/home/ubuntu/moa`         | Variable | Environment | 公開資訊，不同環境可能不同 |
| 生產資料庫連線字串    | `postgres://user:pass@...` | Secret   | Environment | 包含密碼，不同環境不同     |
| JWT 密鑰              | `random_secret_key`        | Secret   | Environment | 敏感資訊，不同環境應不同   |

##### 💡 判斷原則

**使用 Variable（變數）的時機：**

- ✅ 可以公開顯示在日誌中
- ✅ 不是密碼、Token、私鑰等敏感資訊
- ✅ 例如：主機名稱、使用者名稱、埠號、路徑、網址

**使用 Secret（密鑰）的時機：**

- 🔒 絕對不能出現在日誌中
- 🔒 包含敏感資訊
- 🔒 例如：密碼、API Token、SSH 私鑰、資料庫連線字串（含密碼）、JWT 密鑰

**使用 Repository 級別的時機：**

- 🌐 所有環境都使用相同的值
- 🌐 通用配置，不分環境
- 🌐 例如：Docker Hub 憑證、測試資料庫配置、共用的第三方 API Key

**使用 Environment 級別的時機：**

- 🎯 不同環境需要不同的值
- 🎯 需要環境隔離和保護規則
- 🎯 例如：生產/測試伺服器配置、不同環境的資料庫、不同的 JWT 密鑰

##### ⚠️ 常見錯誤示範

❌ **錯誤 1**：把 SSH 私鑰放在 Variable 中

```yaml
# ❌ 錯誤！私鑰會顯示在日誌中
- run: echo "${{ vars.DEPLOY_SSH_KEY }}"
```

✅ **正確**：應該放在 Secret 中

```yaml
# ✅ 正確！Secret 會被遮蔽
- run: echo "${{ secrets.DEPLOY_SSH_KEY }}" > key.pem
```

❌ **錯誤 2**：把生產資料庫 URL 放在 Repository Secret

```yaml
# ❌ 錯誤！所有環境都會用到同一個資料庫
environment: production
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }} # Repository 級別
```

✅ **正確**：應該放在 Environment Secret

```yaml
# ✅ 正確！不同環境使用不同的資料庫
environment: production # 使用 production 環境的 DATABASE_URL
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }} # Environment 級別
```

❌ **錯誤 3**：把公開的主機 IP 放在 Secret

```yaml
# ❌ 不必要！主機 IP 不是敏感資訊
DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
```

✅ **正確**：應該放在 Variable

```yaml
# ✅ 正確！主機 IP 可以公開
DEPLOY_HOST: ${{ vars.DEPLOY_HOST }}
```

##### 📝 在 Workflow 中使用的語法

**引用 Repository Variable**：

```yaml
${{ vars.VARIABLE_NAME }}
# 例如：${{ vars.DOCKER_USERNAME }}
```

**引用 Repository Secret**：

```yaml
${{ secrets.SECRET_NAME }}
# 例如：${{ secrets.DOCKER_PASSWORD }}
```

**引用 Environment Variable/Secret**：

```yaml
jobs:
  deploy:
    environment: production # 指定環境
    steps:
      - run: echo "${{ vars.DEPLOY_HOST }}" # Environment Variable
      - run: echo "${{ secrets.DEPLOY_SSH_KEY }}" # Environment Secret
```

> **💡 重點**：Environment 級別的配置優先權更高。如果同時存在 Repository 和 Environment 級別的同名配置，會使用 Environment 級別的值。

---

#### 🌍 Environment Secrets（環境級別）

**設定位置**：Settings > Environments

環境級別的密鑰讓你可以為不同環境（生產、測試）設定不同的值，提供更好的隔離性和安全性。

##### 步驟 1：創建環境

1. 前往 **Settings** > **Environments**
2. 點擊 **New environment**
3. 創建以下環境：
   - `production` - 生產環境
   - `staging` - 測試環境（可選）

##### 步驟 2：設定環境保護規則（推薦）

在 **production** 環境中：

1. 勾選 **Required reviewers**（需要審批才能部署）
2. 添加可以批准部署的人員
3. 勾選 **Wait timer**（可選，等待一段時間後才部署）

##### 步驟 3：為每個環境添加配置

在每個環境中，可以設定 **Variables**（變數）和 **Secrets**（密鑰）：

**Environment Variables（環境變數 - 公開資訊）**

```
DEPLOY_HOST          # 伺服器 IP 或網域
                     # 範例：
                     # - production: 54.123.45.67
                     # - staging: 54.123.45.68

DEPLOY_USER          # SSH 使用者名稱
                     # 範例：ubuntu 或 ec2-user

DEPLOY_PORT          # SSH 埠號（預設 22）

DEPLOY_PATH          # 專案部署路徑
                     # 範例：/home/ubuntu/moa

DEPLOY_URL           # 應用程式網址
                     # 範例：
                     # - production: https://moa.example.com
                     # - staging: https://staging.moa.example.com

POSTGRES_USER        # PostgreSQL 使用者名稱
POSTGRES_DB          # PostgreSQL 資料庫名稱
```

**Environment Secrets（環境密鑰 - 敏感資訊）**

```
DEPLOY_SSH_KEY       # SSH 私鑰（完整內容，包含 BEGIN 和 END）
                     # 範例：
                     # -----BEGIN OPENSSH PRIVATE KEY-----
                     # ...私鑰內容...
                     # -----END OPENSSH PRIVATE KEY-----

DEPLOY_SSH_KNOWN_HOSTS # 部署主機的 known_hosts 記錄，啟用嚴格主機驗證
                       # 在可信網路取得：ssh-keyscan -H <部署主機>

DATABASE_URL         # 資料庫連線字串（包含密碼）
                     # 範例：postgres://user:pass@db:5432/dbname
                     # ⚠️ 生產和測試環境應使用不同的資料庫
                     # 💡 注意：使用 @db:5432（容器名稱）而非 @localhost:5432
                     #    因為在 Docker Compose 中，容器間透過服務名稱通訊

JWT_SECRET           # JWT 密鑰（至少 32 字元的隨機字串）
                     # 生成方式：openssl rand -base64 48

POSTGRES_PASSWORD    # PostgreSQL 密碼（建議使用強密碼）
```

**通知配置（可選 - Secrets）**

```
TELEGRAM_BOT_TOKEN   # Telegram Bot Token（用於部署通知）
                     # 範例：123456789:ABCdefGHIjklMNOpqrsTUVwxyz
                     # 取得方式：向 @BotFather 申請

TELEGRAM_CHAT_ID     # Telegram Chat ID 或 Channel ID
                     # 範例：-1001234567890（群組）或 123456789（個人）
                     # 取得方式：使用 @userinfobot 或 @getmyid_bot
```

> **💡 區分原則**：
>
> - **Variable（變數）**：使用者名稱、主機位址、埠號、路徑等公開資訊
> - **Secret（密鑰）**：密碼、Token、私鑰、包含密碼的連線字串等敏感資訊

---

#### 🔑 如何生成安全的密鑰

**生成 JWT Secret**：

```bash
# 生成 48 字元的隨機密鑰
openssl rand -base64 48
```

**生成資料庫密碼**：

```bash
# 生成 24 字元的隨機密碼
openssl rand -base64 24
```

**獲取 SSH 私鑰**：

```bash
# 查看你的 SSH 私鑰（通常在這些位置）
cat ~/.ssh/id_rsa
cat ~/.ssh/id_ed25519

# 或者生成新的 SSH 金鑰對
ssh-keygen -t ed25519 -C "deploy-key-moa"
```

**獲取 Docker Hub Access Token**（推薦，比密碼更安全）：

1. 登入 [Docker Hub](https://hub.docker.com/)
2. 前往 **Account Settings** > **Security** > **Access Tokens**
3. 點擊 **New Access Token**
4. 設定權限為 **Read, Write, Delete**
5. 複製生成的 token

**設定 Telegram Bot（用於部署通知）**：

1. **建立 Telegram Bot**：
   - 在 Telegram 中搜尋 `@BotFather`
   - 發送 `/newbot` 指令
   - 依照指示設定 Bot 名稱和使用者名稱
   - 複製得到的 **Bot Token**（格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

2. **取得 Chat ID**：

   **方法 1：使用 Bot 取得個人 Chat ID**
   - 搜尋 `@userinfobot` 或 `@getmyid_bot`
   - 開啟對話即可看到你的 Chat ID

   **方法 2：取得群組 Chat ID**
   - 將你的 Bot 加入群組
   - 在群組中發送任意訊息
   - 在瀏覽器訪問：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - 在返回的 JSON 中找到 `"chat":{"id":-1001234567890}` 的值

   **方法 3：使用 curl 指令**

   ```bash
   # 將你的 Bot 加入群組後，在群組發送訊息，然後執行：
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```

3. **測試通知**：
   ```bash
   # 測試發送訊息
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
     -d "chat_id=<YOUR_CHAT_ID>" \
     -d "text=Test message from MOA"
   ```

> **💡 提示**：
>
> - Chat ID 可以是個人（正整數）或群組/頻道（負整數）
> - 記得給 Bot 在群組中的發言權限
> - 建議建立一個專門的部署通知頻道或群組

```

```
