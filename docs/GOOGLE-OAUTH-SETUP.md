# Google OAuth 設定指南

## 1. 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊右上角的「選取專案」，然後點擊「新增專案」
3. 輸入專案名稱（例如：MOA Game），然後點擊「建立」

## 2. 啟用 Google+ API

1. 在左側選單中選擇「API 和服務」→「程式庫」
2. 搜尋「Google+ API」或「Google People API」
3. 點擊並啟用該 API

## 3. 建立 OAuth 2.0 憑證

1. 在左側選單中選擇「API 和服務」→「憑證」
2. 點擊「建立憑證」→「OAuth 用戶端 ID」
3. 如果是第一次建立，需要先設定「OAuth 同意畫面」：
   - 選擇「外部」（除非你有 Google Workspace）
   - 填寫應用程式名稱（例如：MOA Game）
   - 填寫使用者支援電子郵件
   - 填寫開發人員聯絡資訊
   - 點擊「儲存並繼續」
   - 在「範圍」頁面，點擊「新增或移除範圍」
   - 選擇 `.../auth/userinfo.email` 和 `.../auth/userinfo.profile`
   - 點擊「儲存並繼續」
   - 在「測試使用者」頁面，新增你的測試帳號（開發階段需要）
   - 點擊「儲存並繼續」

4. 回到「憑證」頁面，再次點擊「建立憑證」→「OAuth 用戶端 ID」
5. 選擇應用程式類型：「網頁應用程式」
6. 輸入名稱（例如：MOA Web Client）
7. 在「已授權的重新導向 URI」中新增：
   - 開發環境：`http://localhost:5173/auth/google/callback`
   - 生產環境：`https://yourdomain.com/auth/google/callback`
8. 點擊「建立」
9. 複製「用戶端 ID」和「用戶端密鑰」

## 4. 設定環境變數

建立或編輯 `.env` 檔案（開發環境）：

```env
GOOGLE_CLIENT_ID=你的-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=你的-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

建立或編輯 `.env.production` 檔案（生產環境）：

```env
GOOGLE_CLIENT_ID=你的-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=你的-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
```

## 5. 執行資料庫遷移

在 PowerShell 中執行：

```powershell
npm run db:migrate
```

## 6. 測試 Google 登入

1. 啟動開發伺服器：`npm run dev`
2. 前往 `http://localhost:5173/auth/login`
3. 點擊「使用 Google 登入」按鈕
4. 使用你的 Google 帳號登入（需要是測試使用者中的帳號）
5. 授權後應該會重定向回首頁

## 7. 發布到生產環境

當你的應用程式準備好上線時：

1. 回到 Google Cloud Console
2. 前往「OAuth 同意畫面」
3. 點擊「發布應用程式」
4. 更新 `.env.production` 中的 `GOOGLE_REDIRECT_URI` 為你的生產環境網址
5. 在 Google Cloud Console 的「憑證」中，更新「已授權的重新導向 URI」

## 疑難排解

### 錯誤：redirect_uri_mismatch

確保 Google Cloud Console 中設定的重新導向 URI 與環境變數 `GOOGLE_REDIRECT_URI` 完全一致。

### 錯誤：access_denied

確保你的 Google 帳號已被新增到測試使用者清單中（在開發階段）。

### 錯誤：invalid_client

檢查 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 是否正確。

## 安全注意事項

- 永遠不要將 `.env` 檔案提交到版本控制系統
- 在生產環境中使用 HTTPS
- 定期輪換 OAuth 憑證
- 限制 OAuth 範圍到最小必要權限
