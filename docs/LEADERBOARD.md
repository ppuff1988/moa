# 公開排行榜

排行榜開放所有訪客查看，公開資料只包含玩家暱稱與戰績，不提供帳號 Email、頭像或內部使用者 ID。

## 頁面與 API

- `/leaderboard`：累計勝場總榜。
- `/leaderboard/roles/:id`：依角色統計的獨立勝場榜。
- `/api/leaderboard`：回傳總榜前 10 名、角色榮譽與統計資料。
- `/api/leaderboard?role=:id`：回傳指定角色榜前 10 名。

只計入 `finished` 且有最終分數的對局；`terminated`、未完成或沒有角色的紀錄不計入。一局同一玩家只計一筆。許愿陣營以 6 分以上為勝，老朝奉陣營以低於 6 分為勝。同勝場使用競賽排名，例如 `1、1、3`。

榜單只回傳前 10 名，不提供分頁。榜單聚合結果在伺服器記憶體中快取 60 秒，最多保留 48 個角色組合。完成新對局後，榜單會在快取期限結束後更新。

## SEO／AEO

總榜與 8 個角色榜都是公開、可索引頁面，具有獨立的 title、description、canonical 與 `CollectionPage`／`ItemList` 結構化資料。追蹤參數仍使用乾淨的榜單 canonical。

角色 ID 目前依初始化資料固定為 1–8；新增或重新排序角色時，請同步更新 `static/sitemap.xml` 與角色頁的 SEO 測試。

## 測試資料

E2E 測試只可使用開發或測試資料庫。測試帳號會標記為 `users.is_test`，公開排行榜會排除標記資料；正式資料庫不得執行 `migrations/init_test_users.sql`，也不得讓測試建立的完成對局混入公開排行榜。
