# 首頁 SEO 與 AEO 維護

首頁的定位是「MOA 古董局中局非官方網頁桌遊輔助工具」。內容應清楚區分實體桌遊、輔助工具與官方產品，並與實際功能一致。

## 內容與標記

- `src/lib/content/site.ts`：網站名稱、首頁標題、介紹、分享圖片及 WebSite 標記。首頁可見介紹與搜尋、社群摘要共用同一段文字。
- `src/lib/content/home.ts`：FAQ 與 WebPage、WebApplication、FAQPage 標記。修改問答時只需更新這份資料，畫面與 JSON-LD 會一起更新。
- `src/lib/components/home/HomeLanding.svelte`：公開首頁、開局步驟與完整可見問答。各問答有固定網址錨點，方便直接連結到答案。
- `src/routes/+layout.svelte`：canonical、robots 與 Open Graph／Twitter metadata。只有成功回應的首頁與條款頁可索引；驗證、遊戲及錯誤頁面維持 noindex。
- `static/social-home.jpg`：1200 × 630 的實際首頁截圖。首頁視覺大幅改版時應更新，並同步檢查圖片尺寸與替代文字。
- Logo 沿用既有 `pwa-icon-192.png`，工具結構化資料使用同系列的 `pwa-icon-512.png`。

問答與工具標記放在公開首頁元件，登入後顯示遊戲入口時不會輸出未顯示的 FAQ。不要加入未經證實的評分、使用者數、官方授權、作者資格或更新日期。

## 爬取與答案型搜尋

首頁內容與 JSON-LD 由伺服器輸出，爬蟲不執行 JavaScript 也能讀取。`robots.txt` 允許公開頁面與靜態資源，排除 API 和 Socket.IO；保留登入頁可爬取，讓爬蟲讀到 noindex。Sitemap 只列首頁與條款頁。

Google 的生成式搜尋仍遵循一般搜尋的內容、爬取與索引基礎，不需要特別建立 `llms.txt` 或使用特殊 AEO schema。結構化資料協助表達內容，不能保證索引、排名或 AI 引用。[Google 官方 AI 搜尋優化指引](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

FAQPage 保留作為與可見問答一致的語意資料。Google 已停止顯示 FAQ rich results，因此不以 FAQ 標記作為取得搜尋問答展開效果的承諾。[Google Search 文件更新紀錄](https://developers.google.com/search/updates)

## 驗證與上線後觀察

本機驗證：

```bash
npm run check
npx playwright test e2e/seo.test.ts e2e/homepage.test.ts --workers=1
npm run build
```

測試涵蓋無 JavaScript 內容、可見問答與 JSON-LD 一致性、唯一 metadata、追蹤參數 canonical、公開與非公開頁索引設定、404、分享圖片回應，以及路由切換後的標記清理。

部署後再執行以下檢查；本次本機修改不會自動提交索引或改動搜尋平台帳戶：

1. 在 Google Search Console 的網址審查確認正式首頁能抓取、canonical 正確，再提出重新索引要求。
2. 確認正式環境的 `/robots.txt`、`/sitemap.xml` 與 `/social-home.jpg` 可公開存取，CDN 或 WAF 沒有攔截合法搜尋爬蟲。
3. 以 Schema.org Validator 驗證語意資料，並透過 Search Console 觀察索引、查詢曝光與點擊。分享平台若仍顯示舊圖，需重新抓取網址預覽。
4. 若已連接 Bing Webmaster Tools，可觀察其 AI Performance 報表中的引用與來源頁面；不要以本機測試通過視為已有搜尋成效。[Bing AI Performance 說明](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)
