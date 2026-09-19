# MOA 開發協作指南

> AI 開發代理指南 | 更新日期：2026-09-20

本文件適用於整個 repository。使用繁體中文溝通與撰寫使用者介面文案，程式識別字沿用專案的英文命名。使用者在目前任務中的明確要求優先；若子目錄另有 `AGENTS.md`，修改該目錄前先閱讀。

## 專案與閱讀入口

MOA 是「古董局中局」非官方桌遊輔助網站，支援實體與線上遊玩。對外名稱使用「古董局中局」。

- 環境與安裝：[README.md](README.md)。實際 Node.js／npm 版本要求以 [package.json](package.json) 的 `engines`、`packageManager` 為準。
- 遊戲規則：[docs/RULE.md](docs/RULE.md)。修改玩法前先核對規則及對應測試。
- 分支與發布：[docs/WORKFLOWS.md](docs/WORKFLOWS.md)。實際 CI 行為以 `.github/workflows/` 為準。
- 介面風格：[docs/STYLE.md](docs/STYLE.md)，實際樣式與變數參考 `src/app.css` 及相鄰元件。
- 座位與私人筆記：[實作設計與驗收紀錄](docs/development/discussion-notes-plan.md)。

技術組合為 Svelte 5、SvelteKit 2、TypeScript、Tailwind CSS 4、PostgreSQL、Drizzle ORM、Socket.IO 與 PWA。使用 npm 與 `package-lock.json`，沿用既有相依套件及架構。

## 程式位置

| 位置                                           | 用途                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `src/routes/`                                  | SvelteKit 頁面、載入器與 API；房間 API 集中於 `api/room/[name]/` |
| `src/lib/server/`                              | 遊戲規則、驗證、交易、Socket、認證與其他伺服器服務               |
| `src/lib/server/db/schema.ts`                  | Drizzle schema                                                   |
| `src/lib/components/`                          | 遊戲、房間、玩家與共用 UI 元件                                   |
| `src/lib/stores/`、`composables/`、`services/` | 前端狀態、流程組合與 API 呼叫                                    |
| `src/lib/types/`、`utils/`                     | 共用型別與工具；避免由此引入伺服器秘密或資料庫                   |
| `migrations/`                                  | 手寫 SQL migration、初始化及清除腳本                             |
| `scripts/`                                     | 開發／正式服務、migration、測試啟動及郵件 worker                 |
| `e2e/`                                         | Playwright 測試，`smoke/` 為精簡 CI 路徑                         |
| `static/`                                      | 圖片與 PWA 素材；獸首沿用 `static/zodiac/`                       |

## 開始工作與實作方式

1. 先看 `git status`、目前分支、任務相關文件及相鄰程式。工作區可能已有未提交成果，保留並辨識其用途。
2. 優先用 `rg` 搜尋既有實作。大型遊戲頁只負責組裝，新增規則、查詢及互動放到對應模組。
3. 修改限定在任務需要的範圍。新增規則或修 bug 時，優先用行為測試重現問題及驗收結果。
4. 更新相關規則、API 說明與 migration 指引。交付時說明改動、實際驗證結果及尚未驗證的部分。

- TypeScript 保留明確型別；外部輸入先當作 `unknown` 驗證，避免以型別斷言取代驗證。
- 新元件可使用 Svelte 5 runes；修改既有元件時沿用其模式，避免為單一功能全面改寫舊語法。
- 遵循 Prettier／ESLint：tab 縮排、單引號、無尾逗號、100 字元行寬；`each` 使用穩定 ID 作 key。
- 非同步請求要處理失敗、過期回應與元件卸載。私人狀態不能放在 SSR 模組共用的全域 store。
- 格式化指定變更檔案，避免用全專案格式化混入無關差異。

## 遊戲規則與資料界線

- 支援 6／7／8 人、三輪遊戲。自動選角、線上投票及座位模式是獨立設定，改動需考慮其組合。
- 固定座位、行動順位、發言順位是不同資料。`actionOrder` 最新行動者在前；取得正序時參考 `game-turn-order.ts`，不要用技能紀錄筆數推算順位。
- `seatOrder` 的下一項代表左鄰，尾端接回首項。隨機模式開局抽出；現場模式由房主開局前排列確認。三輪及重新加入均保留座位。
- 討論由最後行動者的左鄰開始，沿座位繞一圈，最後行動者最後發言。只顯示整輪順序，發言使用外部語音或當面進行。
- 舊局若沒有座位，不憑空補排；保留行動排序並提示發言順序不可用。
- 玩家暫時斷線、背景休眠、關閉分頁不等於離房。只有明確離房才設為 `left`；保留遊戲歷史，重新加入後恢復，避免用 Socket disconnect 刪除席位或結束遊戲。
- 私人筆記只允許本人讀寫，房主沒有額外權限。獸首選單含「真／偽／無法鑑定／被攻擊」；被攻擊套用至整輪並清除該輪獸首說法，備註保留。系統不根據筆記自動判定謊言。
- 筆記切換視圖、排序、回合及投票時查閱筆記，不應清除草稿或改變主遊戲回合、已分配籌碼。
- 線上投票保留每輪 2 枚、剩餘累積、第三輪全部投出、提交後鎖定及全員提交才公布的規則。

## API、交易與隱私

- 重用 `src/lib/server/api-helpers.ts` 的登入、房間資格、房主與階段守衛；授權在伺服器執行。
- 驗證 ID、enum、長度、允許欄位，以及玩家／回合／獸首是否屬於同局。筆記擁有者由登入身分決定。
- 遊戲狀態轉換與相依寫入放在既有 transaction 中，沿用相關流程的鎖順序；處理重複請求、同時開局、離房與提交競態。
- 私人筆記保留版本衝突檢查，不能靜默覆蓋另一分頁的修改；舊儲存回應不能覆蓋較新的本地輸入。
- 公共 API 與 Socket payload 使用欄位白名單，避免回傳完整資料列；只依既有規則公開角色及結果，不洩漏他人的鑑定、私人筆記或尚未公開的獸首真值。
- 私人 API 使用 `Cache-Control: private, no-store`。新增端點時檢查 `vite.config.ts` 的 PWA runtime caching，私人端點須在通用 API 快取規則之前排除。
- `.env*`、資料庫連線字串、JWT、OAuth 及郵件憑證不可寫入文件、測試截圖或 log。正式服務不得開放測試資料建立端點。

## 手機介面

- 沿用古董主題、既有元件及獸首圖片，優先使用既有樣式變數。
- 至少檢查 375／390／430px 寬度、6–8 人與長姓名；避免整頁水平溢出，觸控目標至少 44px。
- 狀態要有文字，不能只依靠顏色。輸入欄位有 label，按鈕有可辨識名稱。
- 對話框處理焦點、鍵盤關閉及返回觸發位置；手機考慮安全區、軟鍵盤與中文組字。
- 多視圖共用同份資料；展開狀態與編輯資料綁定穩定 player ID，不依排序索引綁定。

## 開發與驗證指令

| 指令                               | 用途／前提                                                          |
| ---------------------------------- | ------------------------------------------------------------------- |
| `npm ci`                           | 依 lockfile 安裝套件                                                |
| `npm run dev`                      | 啟動含 Socket.IO 的開發服務，預設 port 5173                         |
| `npm run check`                    | Svelte／TypeScript 檢查                                             |
| `npm run lint`                     | Prettier 與 ESLint                                                  |
| `npm run build`                    | 正式建置與 PWA 產物                                                 |
| `npm run test:unit -- --run`       | `src/lib/` 非瀏覽器單元測試                                         |
| `npx vitest run --project client`  | 真實瀏覽器中的 `*.svelte.test.ts` 元件測試                          |
| `npm run test:api`                 | 對已啟動的測試服務跑 API 測試                                       |
| `npm run test:api:auto`            | 自行啟動測試服務後跑 API；預設 port 5174，可指定 `TEST_SERVER_PORT` |
| `npm run test:e2e:smoke`           | Playwright 精簡流程                                                 |
| `npm run test:e2e:game-completion` | 八人三輪完整遊戲及結算                                              |
| `npm run db:migrate`               | 對指定資料庫套用尚未執行的 SQL migration                            |

- API／E2E 使用隔離測試資料庫，先確認 `DATABASE_URL`；服務與測試需使用相同資料庫、`JWT_SECRET` 及 `API_BASE_URL`。`test:api:auto` 只代管服務，不會自動隔離資料庫。
- 自訂測試 port 時，同步設定服務的 `PORT` 與測試的 `API_BASE_URL`。`npm run dev` 會把 `NODE_ENV` 設為 development，不能僅靠外層 `NODE_ENV=test` 判斷連到了測試資料庫。
- `npm run dev:vite` 不取代含 Socket.IO 的完整服務。Socket 或 Vite 設定改動後，若連線異常，先確認服務有真正重啟且 port 未被舊程序佔用。
- Playwright 在 `CI=1` 時不自動啟動 web server。可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定已安裝的 Chromium／Chrome。
- 部分 server 單元測試會載入 DB 模組；執行前仍需準備適當環境。不要把 Vitest server project 當成不需服務的純單元測試集合。
- 依修改範圍選測試：規則／權限／交易跑單元與 API，互動跑元件，跨階段流程跑 E2E。純文件修改只需格式與連結檢查。
- 程式交付前執行適用的 check、lint、build；發現失敗時確認原因，記錄未解決項目。只有實際執行並通過的檢查才能標示通過。
- `check` 與 `build` 都會更新 `.svelte-kit`，依序執行。清理由本次任務建立的測試資料、容器與程序，保留使用者既有服務。

## 資料庫與 Git

- 新 schema 同步更新 Drizzle 與 `migrations/`。新增下一個可用編號的 `NNNN_description.sql`；runner 按檔名排序並以完整檔名追蹤，保留已存在的 migration 名稱與內容。
- 同步檢查 `init_database.sql`、`reset_games.sql` 與測試 fixtures 的外鍵清除順序，驗證舊庫升級及全新初始化。
- 部署時 migration 可能與舊服務同時存在，維持向後相容並先套 schema。不要為驗證功能對一般開發或正式資料庫執行 reset、drop 或清空。
- 使用者已指定的分支與命名優先。一般新功能依工作流程從 `dev` 建立 `feature/*`；沿用任務已有的 `feat/*`，不為命名另行改分支。
- 功能 PR 通常指向 `dev`；hotfix 依工作流程處理。建立 PR 前檢查基底差異，不直接推送 `main` 或 `dev`。
- Commit 與 PR 標題使用 Conventional Commits。依使用者授權範圍執行 commit、push、PR、合併或部署；一般實作不視為已要求發布。
- Commit 只納入本次授權範圍的修改，保留其他未提交成果；不覆寫使用者改動、不任意 reset 或 force push，不例行略過 Git hooks。
- 不手動調升版本來完成一般功能；版本、release 與部署沿用既有自動化流程。
