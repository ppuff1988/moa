import { test, expect } from '@playwright/test';

test.describe('忘記密碼流程', () => {
	const testEmail = 'test-user-forgot-pw@example.com';
	const testPassword = 'oldpassword123';

	test.beforeAll(async ({ request }) => {
		// 註冊測試用戶
		await request.post('http://localhost:5173/api/auth/register', {
			data: {
				email: testEmail,
				password: testPassword,
				nickname: 'Forgot Password Test'
			}
		});
	});

	test('應該能夠完成完整的忘記密碼流程', async ({ page }) => {
		// 1. 前往登入頁面
		await page.goto('http://localhost:5173/auth/login');
		await expect(page).toHaveTitle(/MOA/);

		// 2. 點擊忘記密碼連結
		await page.click('text=忘記密碼');
		await expect(page).toHaveURL(/\/auth\/forgot-password/);

		// 3. 輸入 Email 並提交
		await page.fill('input[type="email"]', testEmail);
		await page.click('button[type="submit"]');

		// 4. 應該顯示成功訊息
		await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
		await expect(page.locator('.success-message')).toContainText('密碼重置郵件已發送');

		// 注意：在實際測試中，這裡需要從郵件或資料庫中獲取重置 token
		// 為了測試目的，我們需要手動從資料庫獲取 token
		// 這裡假設我們有一個測試環境可以訪問資料庫

		// 模擬點擊郵件中的連結（使用測試 token）
		// 在實際環境中，您需要實作一個測試專用的 API 來獲取 token
	});

	test('應該能夠訪問忘記密碼頁面', async ({ page }) => {
		await page.goto('http://localhost:5173/auth/forgot-password');

		await expect(page.getByRole('heading', { name: '忘記密碼' })).toBeVisible();
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});

	test('應該驗證 Email 輸入', async ({ page }) => {
		await page.goto('http://localhost:5173/auth/forgot-password');

		// 嘗試提交空表單
		await page.click('button[type="submit"]');

		// HTML5 驗證應該阻止提交
		const emailInput = page.locator('input[type="email"]');
		await expect(emailInput).toHaveAttribute('required', '');
	});

	test('應該顯示載入狀態', async ({ page }) => {
		await page.goto('http://localhost:5173/auth/forgot-password');

		await page.fill('input[type="email"]', testEmail);

		// 點擊提交按鈕並同時等待請求
		const submitButton = page.locator('button[type="submit"]');

		// 使用 Promise.all 來同時處理點擊和等待
		const [response] = await Promise.all([
			page.waitForResponse(
				(resp) =>
					resp.url().includes('/api/auth/forgot-password') && resp.request().method() === 'POST'
			),
			submitButton.click()
		]);

		// 驗證請求成功
		expect(response.ok()).toBeTruthy();

		// 驗證成功訊息出現
		await expect(page.locator('.success-message')).toBeVisible();
	});

	test('應該有返回登入的連結', async ({ page }) => {
		await page.goto('http://localhost:5173/auth/forgot-password');

		const loginLink = page.locator('a[href="/auth/login"]');
		await expect(loginLink).toBeVisible();
		await expect(loginLink).toContainText('登入');
	});

	test('重置密碼頁面 - 應該驗證密碼輸入', async ({ page }) => {
		// 使用測試 token 訪問重置密碼頁面
		const testToken = 'test-token-123';
		await page.goto(`http://localhost:5173/auth/reset-password?token=${testToken}`);

		await expect(page.getByRole('heading', { name: '重置密碼' })).toBeVisible();

		// 檢查密碼輸入欄位存在
		const passwordInputs = page.locator('input[type="password"]');
		await expect(passwordInputs).toHaveCount(2); // 新密碼和確認密碼
	});

	test('重置密碼頁面 - 應該驗證密碼確認', async ({ page }) => {
		const testToken = 'test-token-123';
		await page.goto(`http://localhost:5173/auth/reset-password?token=${testToken}`);

		// 輸入不匹配的密碼
		const passwordInputs = page.locator('input[type="password"]');
		await passwordInputs.nth(0).fill('password123');
		await passwordInputs.nth(1).fill('differentpassword');

		await page.click('button[type="submit"]');

		// 應該顯示錯誤訊息
		await expect(page.locator('.error-message')).toBeVisible();
		await expect(page.locator('.error-message')).toContainText('不一致');
	});

	test('重置密碼頁面 - 應該驗證密碼長度', async ({ page }) => {
		const testToken = 'test-token-123';
		await page.goto(`http://localhost:5173/auth/reset-password?token=${testToken}`);

		// 輸入過短的密碼
		const passwordInputs = page.locator('input[type="password"]');
		await passwordInputs.nth(0).fill('123');
		await passwordInputs.nth(1).fill('123');

		await page.click('button[type="submit"]');

		// 應該顯示錯誤訊息
		await expect(page.locator('.error-message')).toBeVisible();
		await expect(page.locator('.error-message')).toContainText('6');
	});

	test('登入頁面應該有忘記密碼連結', async ({ page }) => {
		await page.goto('http://localhost:5173/auth/login');

		const forgotPasswordLink = page.locator('a[href="/auth/forgot-password"]');
		await expect(forgotPasswordLink).toBeVisible();
		await expect(forgotPasswordLink).toContainText('忘記密碼');
	});
});
