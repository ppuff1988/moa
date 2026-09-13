-- Exclude users created by the legacy E2E/API test helpers before is_test existed.
UPDATE users
SET is_test = TRUE
WHERE (
        nickname LIKE '測試\_%' ESCAPE '\'
        AND email LIKE '%@test.com'
      )
   OR email LIKE 'test-%@example.com'
   OR email LIKE 'testuser%@test.com'
   OR email LIKE 'smoke-%@test.com';
