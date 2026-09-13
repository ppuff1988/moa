-- Exclude users created by the legacy E2E/API test helpers before is_test existed.
UPDATE users
SET is_test = TRUE
WHERE nickname LIKE '測試_%'
   OR email LIKE 'test-%@example.com'
   OR email LIKE 'testuser%@test.com'
   OR email LIKE '%@test.com';
