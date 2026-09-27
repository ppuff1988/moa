# 全員離房終止與部署資料修正

- 有效房間成員定義為 `room_presence = 'active' AND left_at IS NULL`，與 Socket 是否連線無關。
- 最後一位成員明確離房後，`waiting`、`selecting`、`playing` 遊戲轉為 `terminated`，設定結束時間；`finished` 與既有 `terminated` 不改變狀態或結束時間。
- 進行中的遊戲保留原始人數、玩家、固定座位、回合、行動、投票與私人筆記。終止後不能重新加入。部分玩家離房仍等待重新加入；選角中不足 6 人仍沿用提前終止規則。
- 選角因人數不足而終止時，僅離房請求者設為 `left`，其餘成員保留原有 presence 與房間查閱資格；人數記錄為終止當下的剩餘成員數，不批次清空。
- 離房與終止在同一交易內依 games → game_players 鎖定，與加入、開局及結算互斥。只有交易提交後才通知 Socket。
- 離房 API 在本次終止時回傳 `gameEnded: true`、`gamePaused: false`；仍在進行中的遊戲回傳 `gamePaused: true`。

## 部署時修正既有資料

新增 `0020_terminate_empty_unfinished_games.sql`，由既有 migration runner 在正式部署時執行，不需人工 UPDATE：

1. 鎖定未完成遊戲及其玩家，再重新檢查有效成員。
2. 已無有效成員（包含空房）的未完成遊戲標記為 `terminated`，補上結束時間；保留其餘資料。
3. 全員暫時斷線、仍有部分成員、`finished` 或 `terminated` 均不更新。
4. SQL 可重複執行，已終止遊戲不重設時間；runner 以完整 migration 檔名追蹤一般升級，部署額外傳入 `--repair-empty-games`，每次重新執行補修，不受既有 migration 紀錄影響。

使用 repository 的 `deploy-prod.sh`，流程為拉取指定版本 → 停止舊 App／Worker → migrations 與空局補修 → 啟動新版服務 → health check。停止完成後才執行第一次 migration 與後續補修，避免把建立中、尚未加入房主的房間誤判為空房，也避免舊服務在掃描後繼續產生未終止的空局。服務在這段維護期間會短暫中斷。migrations 使用部署環境的 `DATABASE_URL`（CD 由 GitHub secret 寫入），本機的 `POSTGRES_PROD_*` 不會自動覆蓋部署設定，也不應寫入版本庫。`SKIP_MIGRATION=true` 會中止部署；停止服務、migration 或補修失敗時會嘗試恢復舊映像；首次部署無舊映像可恢復。若回退後舊版又產生空局，下次部署仍會補修。

執行此資料修正前必須停止所有會建立房間或變更成員的服務；不要在服務運行中單獨執行 0020 或使用 `--repair-empty-games`。正式部署由腳本完成停止與恢復，不需人工更新資料庫。

停止服務前須成功準備 App／Worker 兩者的回復映像。若只存在其中一個舊容器，部署會在拉取映像前中止並保留既有服務，待缺少的舊版容器恢復後再重試；兩者皆不存在才視為首次部署。

這是資料修正，沒有新增 schema 或外鍵，全新初始化與 reset 順序不需調整。回退應用版本時保留修正後狀態，不自動恢復已全員離房的遊戲。

本次正式資料檢查使用唯讀交易，發現 8 筆 `playing` 遊戲已全員明確離房；未直接修改正式資料。實際更新名單以部署時重新檢查為準。
