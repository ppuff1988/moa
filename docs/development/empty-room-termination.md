# 全員離房終止與部署資料修正

- 有效房間成員定義為 `room_presence = 'active' AND left_at IS NULL`，與 Socket 是否連線無關。
- 最後一位成員明確離房後，`waiting`、`selecting`、`playing` 遊戲轉為 `terminated`，設定結束時間；`finished` 與既有 `terminated` 不改變狀態或結束時間。
- 進行中的遊戲保留原始人數、玩家、固定座位、回合、行動、投票與私人筆記。終止後不能重新加入。部分玩家離房仍等待重新加入；選角中不足 6 人仍沿用提前終止規則。
- 離房與終止在同一交易內依 games → game_players 鎖定，與加入、開局及結算互斥。只有交易提交後才通知 Socket。
- 離房 API 在本次終止時回傳 `gameEnded: true`、`gamePaused: false`；仍在進行中的遊戲回傳 `gamePaused: true`。

## 部署時修正既有資料

新增 `0020_terminate_empty_unfinished_games.sql`，由既有 migration runner 在正式部署時執行，不需人工 UPDATE：

1. 鎖定未完成遊戲及其玩家，再重新檢查有效成員。
2. 已無有效成員（包含空房）的未完成遊戲標記為 `terminated`，補上結束時間；保留其餘資料。
3. 全員暫時斷線、仍有部分成員、`finished` 或 `terminated` 均不更新。
4. SQL 可重複執行，已終止遊戲不重設時間；runner 以完整 migration 檔名追蹤。

使用 repository 的 `deploy-prod.sh`，流程為拉取指定版本 → migrations → 啟動新版服務 → health check。migrations 使用部署環境的 `DATABASE_URL`（CD 由 GitHub secret 寫入），本機的 `POSTGRES_PROD_*` 不會自動覆蓋部署設定，也不應寫入版本庫。`SKIP_MIGRATION=true` 會中止部署；migration 失敗時保留舊服務。

這是資料修正，沒有新增 schema 或外鍵，全新初始化與 reset 順序不需調整。回退應用版本時保留修正後狀態，不自動恢復已全員離房的遊戲。

本次正式資料檢查使用唯讀交易，發現 8 筆 `playing` 遊戲已全員明確離房；未直接修改正式資料。實際更新名單以部署時重新檢查為準。
