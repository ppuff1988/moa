# Safari Google OAuth 修復總結

## 變更日期

2025-01-09

## 問題描述

Safari 瀏覽器的 Google OAuth 登入流程會失敗，原因是：

1. **Cookie SameSite 限制**：Safari 對 `SameSite=Lax` 的跨站請求有嚴格限制
2. **ITP (Intelligent Tracking Prevention)**：Safari 主動封鎖非 secure 的 cookies
3. **OAuth 流程特性**：從 Google 重定向回來時會觸發跨站請求，Safari 可能阻擋 cookies

## 修復內容

### 1. 更新 OAuth State Cookie 設定

**檔案**：`src/routes/auth/google/+server.ts`

**變更**：

```typescript
// 修改前
cookies.set('google_oauth_state', state, {
	sameSite: 'lax',
	secure: import.meta.env.PROD // 開發環境為 false
});

// 修改後
cookies.set('google_oauth_state', state, {
	sameSite: 'none', // ✓ 支援跨站請求
	secure: true // ✓ 強制啟用（Safari 要求）
});
```

**原因**：

- `SameSite=None` 允許跨站請求攜帶 cookies
- `secure: true` 是 `SameSite=None` 的必要條件
- Safari ITP 要求更嚴格的 cookie 安全設定

### 2. 更新 Callback Cookie 清除邏輯

**檔案**：`src/routes/auth/google/callback/+server.ts`

**變更**：

```typescript
// 修改前
cookies.delete('google_oauth_state', { path: '/' });

// 修改後
cookies.delete('google_oauth_state', {
	path: '/',
	secure: true,
	httpOnly: true,
	sameSite: 'none'
});
```

**原因**：

- Cookie 刪除時必須使用與設定時相同的參數
- 否則 Safari 可能無法正確識別並刪除 cookie

### 3. 支援 HTTPS 開發環境

**檔案**：`vite.config.ts`

**新增**：

```typescript
import fs from 'fs';

const httpsEnabled = fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem');

export default defineConfig({
	server: {
		...(httpsEnabled && {
			https: {
				key: fs.readFileSync('./localhost-key.pem'),
				cert: fs.readFileSync('./localhost.pem')
			}
		})
	}
});
```

**原因**：

- `secure: true` 的 cookies 需要 HTTPS
- 自動偵測機制：有憑證就用 HTTPS，沒有就用 HTTP

### 4. 更新 .gitignore

**檔案**：`.gitignore`

**新增**：

```
# Local SSL certificates (for HTTPS development)
localhost-key.pem
localhost.pem
*.key
*.crt
*.cert
```

**原因**：

- 本地 SSL 憑證不應提交到版控
- 每個開發者應該自己生成

### 5. 新增文檔

新增了三個指南文檔：

1. **`docs/SAFARI-OAUTH-GUIDE.md`**
   - 詳細說明 Safari 的 OAuth 問題
   - 解決方案和測試建議
   - 常見錯誤排查

2. **`docs/HTTPS-DEVELOPMENT-SETUP.md`**
   - HTTPS 開發環境設定步驟
   - mkcert 安裝和使用
   - 疑難排解

3. **本文檔** (`docs/SAFARI-OAUTH-FIX-SUMMARY.md`)
   - 變更總結
   - 開發者操作指南

## 開發者需要的操作

### 方案 A：使用 HTTPS 開發環境（推薦用於 Safari 測試）

1. **安裝 mkcert**

   ```powershell
   choco install mkcert
   ```

2. **生成 SSL 憑證**

   ```bash
   mkcert -install
   mkcert localhost 127.0.0.1 ::1
   ```

3. **更新 .env**

   ```env
   GOOGLE_REDIRECT_URI=https://localhost:5173/auth/google/callback
   ```

4. **更新 Google Cloud Console**
   - 添加重定向 URI：`https://localhost:5173/auth/google/callback`

5. **啟動開發伺服器**

   ```bash
   npm run dev
   ```

   現在會自動使用 HTTPS：`https://localhost:5173`

### 方案 B：不使用 HTTPS（僅用於非 Safari 開發）

如果不需要測試 Safari，可以維持原有的 HTTP 開發環境：

1. **不要生成 SSL 憑證**
2. **保持 .env 使用 HTTP**
   ```env
   GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
   ```
3. **正常啟動**
   ```bash
   npm run dev
   ```

**注意**：在這種情況下，Safari 的 Google OAuth 可能無法正常工作。

## 測試驗證

### Chrome/Firefox（無需 HTTPS）

- ✅ 原有功能應該繼續正常運作
- ✅ 使用 HTTP 或 HTTPS 都可以

### Safari（需要 HTTPS）

1. 使用 `https://localhost:5173` 訪問
2. 測試 Google OAuth 登入流程
3. 檢查開發者工具：
   - Cookies 應該有 `Secure` 標記
   - `SameSite` 應該為 `None`
   - 不應該有 cookie 被封鎖的警告

## 影響範圍

### 影響的功能

- ✅ Google OAuth 登入（Safari）
- ✅ 跨瀏覽器兼容性提升

### 不影響的功能

- ✅ 一般登入（帳號密碼）
- ✅ 其他瀏覽器的 Google OAuth
- ✅ 遊戲核心功能
- ✅ 房間管理功能

### 向後兼容性

- ✅ 完全向後兼容
- ✅ 不使用 HTTPS 的開發環境仍可運作（除了 Safari OAuth）
- ✅ 生產環境無需額外變更（已使用 HTTPS）

## 技術細節

### Cookie 屬性對比

| 屬性       | 修改前  | 修改後   | 原因                     |
| ---------- | ------- | -------- | ------------------------ |
| `sameSite` | `'lax'` | `'none'` | Safari 跨站請求需要      |
| `secure`   | `PROD`  | `true`   | `SameSite=None` 必須搭配 |
| `httpOnly` | `true`  | `true`   | 維持安全性               |
| `maxAge`   | `600`   | `600`    | 無變更                   |

### 為什麼需要 SameSite=None？

OAuth 流程：

```
你的網站 (localhost:5173)
    ↓ 重定向
Google OAuth (accounts.google.com)
    ↓ 授權後重定向
你的網站 callback (localhost:5173/auth/google/callback)
    ↑ 這是跨站請求！需要讀取之前設定的 cookies
```

- `SameSite=Lax`：不允許 POST 跨站請求攜帶 cookies
- `SameSite=None`：允許所有跨站請求攜帶 cookies（需要 `secure: true`）

### Safari ITP 行為

Safari 的 ITP 會：

- 封鎖第三方 cookies
- 對非 secure cookies 更嚴格
- 對 `SameSite=Lax` 的跨站 POST 限制更嚴

我們的修復措施：

- 使用 `SameSite=None` + `secure: true`
- 提供 HTTPS 開發環境支援
- 確保 cookie 設定與刪除使用相同參數

## 參考文檔

- [Safari ITP 官方文檔](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- [SameSite Cookie 說明](https://web.dev/samesite-cookies-explained/)
- [mkcert GitHub](https://github.com/FiloSottile/mkcert)
- 專案文檔：
  - `docs/SAFARI-OAUTH-GUIDE.md`
  - `docs/HTTPS-DEVELOPMENT-SETUP.md`
  - `docs/GOOGLE-OAUTH-SETUP.md`

## 回滾計劃

如果需要回滾這些變更：

1. 還原 `src/routes/auth/google/+server.ts`：

   ```typescript
   sameSite: 'lax';
   secure: import.meta.env.PROD;
   ```

2. 還原 `src/routes/auth/google/callback/+server.ts`
3. 移除 `vite.config.ts` 中的 HTTPS 設定
4. Safari OAuth 會恢復到不可用狀態

## 後續改進建議

1. **條件式設定**：根據環境變數決定是否使用 `SameSite=None`
2. **監控與日誌**：追蹤 Safari 用戶的 OAuth 成功率
3. **自動化測試**：加入 Safari 的 E2E 測試
4. **用戶提示**：在 Safari 上提供更友好的錯誤提示

## 聯絡資訊

如有問題，請查看：

- Issue Tracker
- 專案文檔
- 開發團隊

---

**變更狀態**：✅ 已完成  
**測試狀態**：⏳ 待測試  
**部署狀態**：⏳ 待部署
