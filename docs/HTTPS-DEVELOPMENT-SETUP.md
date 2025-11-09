# HTTPS 開發環境設定指南

## 為什麼需要 HTTPS 開發環境？

在測試 Safari 的 Google OAuth 登入時，需要使用 HTTPS 開發環境，因為：

1. Safari 要求 `SameSite=None` 的 cookies 必須使用 `secure: true`
2. `secure: true` 的 cookies 只能在 HTTPS 連線中使用
3. 現代瀏覽器對跨站 cookies 的安全要求越來越嚴格

## 快速設定步驟

### 1. 安裝 mkcert

#### Windows (使用 Chocolatey)

```powershell
choco install mkcert
```

#### Windows (使用 Scoop)

```powershell
scoop bucket add extras
scoop install mkcert
```

#### macOS (使用 Homebrew)

```bash
brew install mkcert
```

#### Linux

```bash
# Debian/Ubuntu
sudo apt install libnss3-tools
wget https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v*-linux-amd64
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Arch Linux
sudo pacman -S mkcert
```

### 2. 安裝根憑證

```bash
mkcert -install
```

這會將 mkcert 的根憑證安裝到系統的信任存儲中。

### 3. 生成本地憑證

在專案根目錄執行：

```bash
mkcert localhost 127.0.0.1 ::1
```

這會生成兩個檔案：

- `localhost-key.pem` - 私鑰
- `localhost.pem` - 憑證

**注意**：這些檔案已被加入 `.gitignore`，不會被提交到版控。

### 4. 更新環境變數

編輯 `.env` 檔案，更新 Google OAuth 的重定向 URI：

```env
GOOGLE_REDIRECT_URI=https://localhost:5173/auth/google/callback
```

### 5. 更新 Google Cloud Console

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇你的專案
3. 前往「API 和服務」→「憑證」
4. 編輯你的 OAuth 2.0 客戶端 ID
5. 在「已授權的重新導向 URI」中添加：
   ```
   https://localhost:5173/auth/google/callback
   ```
6. 儲存變更

### 6. 啟動開發伺服器

```bash
npm run dev
```

如果一切設定正確，你會看到：

```
VITE v5.x.x  ready in xxx ms

➜  Local:   https://localhost:5173/
➜  Network: use --host to expose
```

注意 URL 現在是 `https://` 而不是 `http://`。

## 驗證設定

### 檢查 HTTPS 是否生效

1. 在瀏覽器中打開 `https://localhost:5173`
2. 應該看到瀏覽器顯示「安全」或鎖頭圖示
3. 不應該有 SSL 憑證警告

### 測試 Google OAuth

1. 點擊「使用 Google 登入」
2. 應該能正常重定向到 Google
3. 授權後應該能成功返回應用
4. 在 Safari 開發者工具中檢查 cookies，確認：
   - `google_oauth_state` 有 `Secure` 標記
   - `SameSite` 設為 `None`

## 自動偵測機制

我們的 `vite.config.ts` 已設定為自動偵測 SSL 憑證：

```typescript
// 檢查是否存在本地 SSL 憑證
const httpsEnabled = fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem');

export default defineConfig({
	server: {
		// 如果存在憑證，自動啟用 HTTPS
		...(httpsEnabled && {
			https: {
				key: fs.readFileSync('./localhost-key.pem'),
				cert: fs.readFileSync('./localhost.pem')
			}
		})
	}
});
```

這表示：

- ✅ 有憑證檔案：自動使用 HTTPS
- ✅ 沒有憑證檔案：使用 HTTP（一般開發）

## 疑難排解

### 問題：瀏覽器顯示憑證錯誤

**原因**：根憑證未正確安裝

**解決方案**：

```bash
# 重新安裝根憑證
mkcert -install

# 清除瀏覽器快取並重新啟動
```

### 問題：mkcert 命令找不到

**原因**：mkcert 未正確安裝或不在 PATH 中

**解決方案**：

- Windows：確認 Chocolatey 或 Scoop 安裝成功
- macOS/Linux：檢查 brew/apt 安裝過程是否有錯誤

### 問題：Vite 仍使用 HTTP

**原因**：憑證檔案位置不正確

**解決方案**：

```bash
# 確認檔案在專案根目錄
ls -la localhost*.pem

# 如果不在，重新生成
mkcert localhost 127.0.0.1 ::1
```

### 問題：Google OAuth 仍然失敗

**檢查清單**：

1. [ ] `.env` 中的 `GOOGLE_REDIRECT_URI` 使用 `https://`
2. [ ] Google Cloud Console 中已添加 HTTPS 重定向 URI
3. [ ] 瀏覽器確實訪問的是 `https://localhost:5173`
4. [ ] Cookies 有 `Secure` 和 `SameSite=None` 屬性

## 移除 HTTPS 設定

如果想回到 HTTP 開發環境：

```bash
# 刪除憑證檔案
rm localhost-key.pem localhost.pem

# 更新 .env
# GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# 重新啟動開發伺服器
npm run dev
```

## 其他瀏覽器

雖然這個設定主要是為了 Safari，但對其他瀏覽器也有好處：

- **Chrome/Edge**：支援更嚴格的安全策略測試
- **Firefox**：與生產環境更一致的開發體驗
- **所有瀏覽器**：避免 "Mixed Content" 警告

## 生產環境部署

生產環境不需要這些步驟，因為：

1. 生產伺服器應該已經有正式的 SSL 憑證（如 Let's Encrypt）
2. `GOOGLE_REDIRECT_URI` 應該指向生產域名
3. Google OAuth 設定中應該有生產 URI

## 參考資料

- [mkcert GitHub](https://github.com/FiloSottile/mkcert)
- [Vite HTTPS 文檔](https://vitejs.dev/config/server-options.html#server-https)
- [Safari ITP 文檔](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
