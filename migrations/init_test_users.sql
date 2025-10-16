-- ==========================================
-- 測試使用者資料插入腳本
-- ==========================================
-- 此腳本僅用於開發/測試環境
-- 請勿在生產環境執行此腳本
-- ==========================================

-- 插入 8 個測試使用者（密碼都是單個字母）
INSERT INTO users (email, nickname, password_hash) VALUES
('a@a.com', '許愿', '$argon2id$v=19$m=19456,t=2,p=1$Hm20VxUKSGzGSLISXlDa9w$zzogxBSOni8lb37jZZQZI4wuyV3LNV5RkvTNJYLZJY8'),
('b@b.com', '方震', '$argon2id$v=19$m=19456,t=2,p=1$oUxGj1wSSe906Hlvl+pVGQ$ZTdcr/ae0fvqS6tmIrRq9g4iLKhO7TQ0Zhn/xx9tF5E'),
('c@c.com', '黃煙煙', '$argon2id$v=19$m=19456,t=2,p=1$iD3qZ6OKcDZgqYoozhxKYg$Xwf3fGm2g/EdPYkKcqzdCmLH9InMjN5Pdk99MmJ+SzU'),
('d@d.com', '木戶加奈', '$argon2id$v=19$m=19456,t=2,p=1$bPp8fL2hz4nutAsWpSdkBA$dVFzqe0m6It+vX5GgF+8N2NYMfMcQPzTytAgzDn3N1w'),
('e@e.com', '老朝奉', '$argon2id$v=19$m=19456,t=2,p=1$bmEkoKsgTYCP7bSVCZ86ig$eS3dFJHMlUE8CHex5sa8BRI6Ri+4ykZZfSp5cKb1t2E'),
('f@f.com', '藥不然', '$argon2id$v=19$m=19456,t=2,p=1$Akaxo+aOjccjbHbH8CZLGw$ugWpUT82vdtEFz/Wseg+wIRrLNWz85z3BVVABtGjTu0'),
('g@g.com', '鄭國渠', '$argon2id$v=19$m=19456,t=2,p=1$ZfEdtZWu9IuMt9BYPQP1hQ$kcTZQ1eFE0yLn3KqG7jG7nFUnH5n17Iw/Pamf2c6fOg'),
('h@h.com', '姬云浮', '$argon2id$v=19$m=19456,t=2,p=1$5sCI2zhWs8t1531D+CnQtw$OVYVRjxlOlTMsSht/5Zec823z2QmgKQAB52LyNftKJI');

-- ==========================================
-- 測試使用者登入資訊
-- ==========================================
-- 使用者名稱（信箱） / 密碼：
-- a@a.com / a （許愿）
-- b@b.com / b （方震）
-- c@c.com / c （黃煙煙）
-- d@d.com / d （木戶加奈）
-- e@e.com / e （老朝奉）
-- f@f.com / f （藥不然）
-- g@g.com / g （鄭國渠）
-- h@h.com / h （姬云浮）

SELECT '總共 ' || COUNT(*) || ' 個測試使用者已創建' as test_users_status FROM users;
