# PWA 功能驗證清單

## ✅ 建置驗證

### 檔案生成確認

- ✅ `manifest.json` - Web App Manifest (1.3KB)
- ✅ `manifest.webmanifest` - 自動生成的 manifest (682B)
- ✅ `pwa-icon-192.png` - 192x192 標準圖示 (99KB)
- ✅ `pwa-icon-512.png` - 512x512 標準圖示 (577KB)
- ✅ `pwa-icon-maskable-192.png` - 192x192 可遮罩圖示 (103KB)
- ✅ `pwa-icon-maskable-512.png` - 512x512 可遮罩圖示 (607KB)

### 配置檔案

- ✅ `vite.config.ts` - PWA 插件已配置
- ✅ `src/app.html` - PWA meta 標籤已添加
- ✅ `src/lib/components/PWAPrompt.svelte` - 更新提示組件已創建
- ✅ `src/routes/+layout.svelte` - PWA 提示已集成
- ✅ `src/pwa.d.ts` - TypeScript 類型定義已創建

### NPM 腳本

- ✅ `npm run pwa:icons` - 圖示生成腳本
- ✅ `npm run build` - 建置成功，PWA 功能已集成
- ✅ `npm run check` - 無 TypeScript 錯誤

## 🧪 功能測試清單

### 開發環境測試

```bash
npm run dev
```

1. **訪問應用程式**
   - [ ] 打開 http://localhost:5173
   - [ ] 在 DevTools Application 標籤中查看 Manifest
   - [ ] 確認所有圖示路徑正確

2. **Service Worker 測試**
   - [ ] 在 DevTools Application > Service Workers 查看註冊狀態
   - [ ] 確認 Service Worker 正在運行
   - [ ] 查看快取的資源

3. **離線測試**
   - [ ] 在 DevTools Network 標籤中啟用 Offline 模式
   - [ ] 重新載入頁面
   - [ ] 確認基本頁面仍可載入（使用快取）

### 生產環境測試

```bash
npm run build
npm run preview
```

1. **安裝提示測試**
   - [ ] 在支援的瀏覽器中訪問應用程式
   - [ ] 確認顯示安裝提示（地址欄或彈窗）
   - [ ] 嘗試安裝應用程式

2. **已安裝應用測試**
   - [ ] 從桌面/主畫面啟動應用
   - [ ] 確認以 standalone 模式運行（無瀏覽器 UI）
   - [ ] 測試所有核心功能

3. **更新機制測試**
   - [ ] 建置新版本
   - [ ] 訪問已安裝的應用
   - [ ] 確認右下角顯示更新提示
   - [ ] 點擊更新並驗證成功

### 跨平台測試

#### Chrome/Edge (桌面)

- [ ] 地址欄顯示安裝圖示 ➕
- [ ] 可以成功安裝
- [ ] 安裝後出現在應用程式列表
- [ ] 可以從開始選單/應用程式資料夾啟動

#### Safari (iOS)

- [ ] 分享選單中有「加入主畫面」選項
- [ ] 可以成功安裝到主畫面
- [ ] 圖示顯示正確
- [ ] 全螢幕模式運行

#### Chrome (Android)

- [ ] 自動顯示安裝橫幅（或選單中有安裝選項）
- [ ] 可以成功安裝
- [ ] 圖示顯示正確
- [ ] 可以從應用程式抽屜啟動

## 🔍 Lighthouse 評分

運行 Lighthouse PWA 審核：

```bash
# 使用 Chrome DevTools
# 1. 打開 DevTools (F12)
# 2. 切換到 Lighthouse 標籤
# 3. 選擇 "Progressive Web App" 類別
# 4. 點擊 "Generate report"
```

**目標評分**：

- [ ] PWA 分數 ≥ 90
- [ ] 可安裝性 ✅
- [ ] 離線支援 ✅
- [ ] 快取策略 ✅

## 📊 預期 PWA 審核項目

### 必須通過

- ✅ 提供有效的 Web App Manifest
- ✅ 包含圖示（至少 192x192 和 512x512）
- ✅ 使用 HTTPS（生產環境）
- ✅ 註冊 Service Worker
- ✅ Service Worker 控制頁面和 start_url
- ✅ 在離線時顯示內容
- ✅ 可以安裝到主畫面

### 最佳實踐

- ✅ 提供可遮罩圖示（maskable icons）
- ✅ 設定主題顏色
- ✅ 設定背景顏色
- ✅ 提供 Apple Touch Icon
- ✅ Viewport meta 標籤已配置

## 🐛 常見問題排查

### Service Worker 未註冊

```javascript
// 在瀏覽器控制台檢查
navigator.serviceWorker.getRegistrations().then(console.log);
```

### 快取問題

```javascript
// 列出所有快取
caches.keys().then(console.log);

// 清除特定快取
caches.delete('cache-name');
```

### Manifest 未載入

- 檢查 Network 標籤確認 manifest.json 是否成功載入
- 檢查 manifest.json 語法是否正確
- 確認 Content-Type 為 application/manifest+json

### 更新未觸發

- 確認 Service Worker 已更新
- 檢查控制台是否有錯誤
- 嘗試手動取消註冊並重新載入

## 📝 手動測試步驟

### 1. 首次訪問

```
1. 清除所有網站資料
2. 訪問應用程式
3. 打開 DevTools > Application
4. 確認：
   - Manifest 已載入
   - Service Worker 已註冊
   - Icons 正確顯示
```

### 2. 離線測試

```
1. 正常載入應用程式
2. 在 DevTools Network 標籤啟用 Offline
3. 重新載入頁面
4. 確認基本頁面仍可訪問
5. 測試快取的 API 響應
```

### 3. 安裝測試

```
1. 點擊瀏覽器的安裝提示
2. 確認安裝成功
3. 關閉瀏覽器
4. 從桌面/主畫面啟動
5. 確認 standalone 模式
```

### 4. 更新測試

```
1. 安裝應用程式
2. 修改程式碼並重新建置
3. 訪問已安裝的應用
4. 等待更新檢測（或重新載入）
5. 確認顯示更新提示
6. 點擊更新
7. 驗證新版本載入成功
```

## ✅ 驗證完成

所有測試通過後，PWA 功能即可投入生產使用！

---

**文檔更新日期**: 2026-01-21
**PWA 插件版本**: @vite-pwa/sveltekit ^1.1.0
**Workbox 版本**: workbox-window ^7.4.0
