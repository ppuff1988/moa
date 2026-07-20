# MOA 程式碼 Review 報告

## Review Findings

### High

#### 1. 遊戲動作缺少回合階段與當前操作者驗證

[`verifyPlayerRole()`](./src/lib/server/api-helpers.ts#L342) 只確認玩家與角色，技能 API 沒有驗證目前是 `action` 階段，也沒有確認 `actionOrder[0]`。此外，[next-player](./src/routes/api/game/next-player/+server.ts#L13) 與 [start-discussion](./src/routes/api/game/start-discussion/+server.ts#L14) 可由任意房內玩家呼叫。

影響：玩家可跳過順序、提早結束行動階段，或在討論／投票期間使用角色技能。

建議建立共用且具交易保護的 guard，同時驗證遊戲狀態、回合階段、當前玩家與合法狀態轉移。

#### 2. Socket `select-role` 可繞過完整選角規則

Production Socket 在 [`production-server.js`](./scripts/production-server.js#L197) 直接更新角色與顏色，沒有確認：

- 遊戲仍在選角階段
- 玩家尚未鎖定
- 角色是否適用目前人數
- 顏色是否合法或已被占用

HTTP 版本的 [lock-role](./src/routes/api/game/lock-role/+server.ts#L12) 有這些檢查，因此攻擊者可直接送 Socket event 繞過它。

建議移除此 mutation event，或讓 Socket 與 HTTP 共用同一個 service/transaction。

#### 3. 指認投票可提早結算，也可用無效票影響完成判斷

[submit-identification](./src/routes/api/game/submit-identification/+server.ts#L67) 接受所有目標都是 `null` 的投票，也沒有完整確認投票資格及目標是否屬於同一場遊戲；後續又以資料列數判斷是否全員完成。[publish-identification](./src/routes/api/game/publish-identification/+server.ts#L29) 則允許房主在票未收齊前直接結算。

影響：可以提早結束投票、錯誤計分，甚至透過不具資格的票讓系統誤判全員已投。

建議驗證角色別必填欄位、合法目標、合資格 voter ID 集合，並在鎖定回合的交易中完成投票與結算。

#### 4. 房間滿員檢查存在競態，可留下 9 位玩家但計數仍是 8

[join API](./src/routes/api/room/join/+server.ts#L48) 先讀取 `playerCount`，之後分開執行玩家新增與計數更新，沒有 transaction 或 row lock。兩人同時加入 7 人房時，兩筆玩家資料都可能成功插入，第二次計數更新才因資料庫的 `<= 8` constraint 失敗。

建議在單一 transaction 內鎖定 game row，或使用 `UPDATE ... WHERE player_count < 8 RETURNING` 原子保留名額，再新增玩家。應新增 7 人房同時加入兩人的邊界測試。

#### 5. JWT secret 缺少時採用公開固定值，屬於 fail-open

[`auth.ts`](./src/lib/server/auth.ts#L8) 與 [`production-server.js`](./scripts/production-server.js#L28) 都有可預測的 fallback secret，而且兩邊還不是同一個值。

影響：部署漏設 `JWT_SECRET` 時，攻擊者可自行簽署 JWT；HTTP 與 Socket 也可能因 secret 不一致產生不同認證結果。

Production 應在 secret 缺少、過短或仍是範例值時直接拒絕啟動，並集中 JWT 實作。

#### 6. Production dependencies 有 5 個 high、4 個 moderate 弱點

`npm audit --omit=dev` 回報 9 個弱點，涉及 [`drizzle-orm`、`nodemailer`、`socket.io` 等](./package.json#L56)，包括 WebSocket 記憶體耗盡／資料洩漏、binary attachment DoS、SQL identifier injection 等。

建議分批升級並跑 DB、郵件與 Socket 回歸測試；不要直接使用 `npm audit fix --force`，因部分修正包含 breaking changes。

### Medium

#### 7. [已修正] Google OAuth 使用者在 production 無法通過 Socket 認證

原本 [Google callback](./src/routes/auth/google/callback/+server.ts#L150) 只建立 Lucia session，沒有產生 JWT；但 production Socket 只接受 `handshake.auth.token`，不接受 Lucia session cookie。前端的 JWT exchange function 目前也沒有呼叫點。

已將 [production Socket authenticator](./scripts/socket-auth.js) 統一為依序驗證 handshake JWT、JWT cookie 與 Lucia `auth_session` cookie。Lucia session 會確認使用者存在且尚未過期，JWT 則保留 `token_version` 撤銷檢查。

Google 瀏覽器登入現在可直接使用既有 Lucia session 建立 production Socket 連線，不需要將長期 JWT 放入 localStorage。

#### 8. [已修正] 恢復玩家行動權時可能讀到另一場遊戲的回合

原本 [`restoreCanActionIfNeeded()`](./src/lib/server/api-helpers.ts#L556) 查詢回合時只用 `round` 編號，沒有 `gameId`。多場遊戲同時位於第 1、2、3 回合時，可能選到錯誤的 `gameRound`，導致技能使用判斷及 `canAction` 恢復錯誤。

已改為由呼叫端直接傳入精確的 `currentRound.id`，並新增[跨遊戲同回合的回歸測試](./src/lib/server/__tests__/api-helpers.test.ts)。

#### 9. [已修正] 重設密碼 token 可被並行重複使用，且不會撤銷現有 session

原本 [reset-password](./src/routes/api/auth/reset-password/+server.ts#L24) 先讀 token，接著分開更新密碼與 token，沒有 transaction 或 atomic consume。兩個並行請求可能都成功，最後密碼取決於執行順序。重設後既有 Lucia session/JWT 也仍有效。

已改為在單一 transaction 內以條件式 `UPDATE ... RETURNING` 原子消耗 token、更新密碼、遞增 `token_version` 並刪除 Lucia sessions。HTTP 與 Socket JWT 驗證會比對 token version，密碼重設前簽發的 JWT 會立即失效。

#### 10. [已修正] Health check 永遠回傳健康，會掩蓋資料庫故障

原本 [`/api/health`](./src/routes/api/health/+server.ts#L3) 固定回傳 200，部署與 Docker health check 都依賴它。即使 DB 無法連線，部署仍可能被判定成功。

現在 `/api/health` 是具 3 秒 timeout 的資料庫 readiness check，資料庫不可用時回傳 503；[`/api/health/live`](./src/routes/api/health/live/+server.ts) 則提供不依賴資料庫的 liveness。Docker health checks 使用 readiness。

#### 11. CI 沒有執行 unit 與 E2E tests

[CI workflow](./.github/workflows/ci-test.yml#L90) 只執行 `test:api`。目前新增的 voting、game-state、store tests 不會在 PR 中執行，E2E 也完全缺席。

建議加入獨立 unit job 與最小 E2E smoke suite。另外目前 Vitest 全域 setup 會讓純函式測試也嘗試連 DB，應拆分測試設定。

### Low

#### 12. 資料重設 SQL 的 transaction 提前結束

[`reset_games.sql`](./migrations/reset_games.sql#L13) 在只刪除部分資料後便 `COMMIT`，其餘刪除操作是 autocommit；最後的 `COMMIT` 無法提供原子性。中途失敗時會留下部分清除狀態。

建議用單一 transaction 包住整份腳本，並在執行端啟用錯誤即停止。

## 驗證結果

| 檢查                   | 結果                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `npm run check`        | 通過，0 errors / 0 warnings                                                          |
| `npm run lint`         | 通過                                                                                 |
| `npm run build`        | 通過；只有 Browserslist 過期與 PWA glob 無匹配警告                                   |
| 純 unit tests          | 10 files、21 tests 全部通過                                                          |
| `npm audit --omit=dev` | 失敗，5 high、4 moderate                                                             |
| Git 工作目錄           | Review 過程未修改原始碼                                                              |
| 完整 API/E2E           | 未執行；本機 PostgreSQL credentials 與測試設定不符，為避免改動共享資料庫而未強制重建 |

## Review 範圍

本次檢查涵蓋所有 tracked files 的整體盤點，以及以下核心執行路徑：

- 認證、授權、Google OAuth 與 JWT
- 遊戲狀態、角色技能、投票與計分
- Socket 即時通訊
- PostgreSQL、Drizzle schema 與 migrations
- 郵件 worker
- 前端狀態與 PWA
- Production 部署與 CI
- Dependencies 與現有測試

近期 public voting result 修正在靜態檢查與現有單元測試中沒有發現新的阻擋問題。
