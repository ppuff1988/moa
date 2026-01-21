# PWA (Progressive Web App) 功能說明

## 概述

MOA 現已支援 PWA 功能，使用者可以將應用程式安裝到桌面或主畫面，享受更接近原生應用的體驗。

## 主要功能

### 1. **可安裝性**

- 使用者可以將 MOA 安裝到設備的主畫面
- 支援 iOS、Android、Windows、macOS、Linux 等平台
- 安裝後可從主畫面直接啟動，無需打開瀏覽器

### 2. **離線支援**

- Service Worker 快取關鍵資源
- 即使在網路不穩定的情況下也能載入基本界面
- API 請求使用 NetworkFirst 策略，優先網路請求但有備用快取

### 3. **自動更新**

- 當有新版本時，會自動提示使用者更新
- 更新通知顯示在右下角
- 使用者可以選擇立即更新或稍後更新

### 4. **快取策略**

- **靜態資源**: 預先快取所有 JS、CSS、HTML、圖片等
- **字型檔案**: CacheFirst 策略，快取一年
- **API 請求**: NetworkFirst 策略，10 秒超時後使用快取
- **外部字型**: Google Fonts 和 Gstatic 使用長期快取

## 安裝方式

### Chrome/Edge (桌面版)

1. 訪問 MOA 網站
2. 在地址欄右側點擊「安裝」圖示 ➕
3. 在彈出的對話框中點擊「安裝」

### Safari (iOS)

1. 在 Safari 中打開 MOA
2. 點擊底部的「分享」按鈕 📤
3. 向下滾動並選擇「加入主畫面」
4. 點擊「加入」

### Chrome (Android)

1. 在 Chrome 中打開 MOA
2. 點擊右上角的選單（⋮）
3. 選擇「安裝應用程式」或「新增至主畫面」

## 技術實作

### Service Worker

使用 Workbox 自動生成 Service Worker，包含以下功能：

- 預先快取靜態資源
- 運行時快取策略
- 離線回退頁面
- 自動清理過期快取

### Manifest

Web App Manifest 定義了應用程式的：

- 名稱和簡稱
- 圖示（多種尺寸，包括 maskable 圖示）
- 主題顏色和背景顏色
- 顯示模式（standalone）
- 啟動 URL 和範圍

### 更新機制

使用 `@vite-pwa/sveltekit` 套件提供的更新機制：

- 自動檢測新版本
- 顯示更新提示
- 無縫更新體驗

## 開發指令

### 生成 PWA 圖示

```bash
npm run pwa:icons
```

這會基於 `static/favicon.png` 生成以下圖示：

- `pwa-icon-192.png` - 192x192 標準圖示
- `pwa-icon-512.png` - 512x512 標準圖示
- `pwa-icon-maskable-192.png` - 192x192 可遮罩圖示
- `pwa-icon-maskable-512.png` - 512x512 可遮罩圖示

### 開發模式測試

PWA 功能在開發模式下也會啟用，可以在本地測試：

```bash
npm run dev
```

### 生產建置

PWA 功能會在生產建置時自動優化：

```bash
npm run build
```

## 瀏覽器支援

| 功能           | Chrome | Edge | Safari | Firefox | Opera |
| -------------- | ------ | ---- | ------ | ------- | ----- |
| 安裝           | ✅     | ✅   | ✅     | ✅      | ✅    |
| Service Worker | ✅     | ✅   | ✅     | ✅      | ✅    |
| 離線模式       | ✅     | ✅   | ✅     | ✅      | ✅    |
| 推送通知       | ✅     | ✅   | ❌     | ✅      | ✅    |

## 最佳實踐

### 1. **快取策略**

- 靜態資源使用 CacheFirst
- API 使用 NetworkFirst 並設定合理的超時時間
- 定期清理過期快取

### 2. **更新通知**

- 在右下角顯示非侵入式的更新提示
- 提供明確的更新和關閉按鈕
- 不強制使用者立即更新

### 3. **圖示設計**

- 提供多種尺寸的圖示以適應不同設備
- Maskable 圖示應在安全區域內顯示重要內容
- 使用一致的視覺風格

### 4. **離線體驗**

- 顯示友好的離線提示
- 快取關鍵頁面和資源
- 在網路恢復時自動重試失敗的請求

## 故障排除

### PWA 無法安裝

1. 確認網站使用 HTTPS（本地開發可使用 localhost）
2. 確認 manifest.json 和 Service Worker 正確載入
3. 檢查瀏覽器控制台是否有錯誤訊息

### Service Worker 未更新

1. 在開發者工具的 Application 標籤中手動取消註冊
2. 清除瀏覽器快取
3. 重新載入頁面

### 圖示未正確顯示

1. 確認圖示檔案存在於 `static/` 目錄
2. 檢查 manifest.json 中的圖示路徑
3. 重新生成圖示：`npm run pwa:icons`

## 相關檔案

- `vite.config.ts` - PWA 插件配置
- `static/manifest.json` - Web App Manifest
- `src/lib/components/PWAPrompt.svelte` - 更新提示組件
- `src/pwa.d.ts` - TypeScript 類型定義
- `scripts/generate-pwa-icons.js` - 圖示生成腳本

## 資源連結

- [PWA 文檔](https://web.dev/progressive-web-apps/)
- [Workbox 文檔](https://developers.google.com/web/tools/workbox)
- [@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
