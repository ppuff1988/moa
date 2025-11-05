/**
 * 身份驗證測試
 * 測試用戶註冊、登入、登出等認證相關功能
 */

import { test, expect } from '@playwright/test';
import {
	TEST_USERS,
	registerUser,
	loginUser,
	logoutUser,
	ensureLoggedIn,
	expectLoginPage,
	expectHomePage,
	expectErrorMessage,
	cleanupTestData
} from './helpers';

test.describe('用戶認證', () => {
	test.beforeEach(async ({ page }) => {
		await cleanupTestData(page);
	});

	test.describe('用戶註冊', () => {
		test('應該成功註冊新用戶', async ({ page }) => {
			const timestamp = Date.now();
			const user = {
				username: `newuser_${timestamp}@test.com`,
				password: 'Test123456!',
				nickname: `新用戶_${timestamp}`
			};

			await registerUser(page, user.username, user.password, user.nickname);

			// 註冊成功後應該重定向到登入頁或首頁
			await expect(page).toHaveURL(/\/(auth\/login|$)/);
		});

		test('應該拒絕弱密碼', async ({ page }) => {
			await page.goto('/auth/register');
			await page.waitForLoadState('networkidle');
			await page.fill('input#email', 'testuser@test.com');
			await page.fill('input#password', '123'); // 弱密碼
			await page.fill('input#confirmPassword', '123');
			await page.fill('input#nickname', '測試用戶');
			await page.click('button[type="submit"]');

			// 等待錯誤訊息出現
			await page.waitForTimeout(1000);

			// 應該顯示錯誤訊息
			await expectErrorMessage(page, '密碼');
		});

		test('應該拒絕重複的用戶名', async ({ page }) => {
			const user = TEST_USERS.user1;

			// 先確保用戶存在（註冊或登入一次）
			await ensureLoggedIn(page, user);

			// 登出以便測試註冊流程
			await logoutUser(page);

			// 現在嘗試用相同的 email 註冊
			await page.goto('/auth/register');
			await page.waitForLoadState('networkidle');

			// 等待頁面完全載入，避免在填寫時被重定向
			await page.waitForSelector('input#nickname', { state: 'visible', timeout: 5000 });

			await page.fill('input#nickname', user.nickname);
			await page.fill('input#email', user.username);
			await page.fill('input#password', user.password);
			await page.fill('input#confirmPassword', user.password);
			await page.click('button[type="submit"]');

			// 等待錯誤訊息出現
			await page.waitForTimeout(1000);

			// 應該顯示用戶已存在的錯誤（停留在註冊頁面）
			await expectErrorMessage(page, 'Email');
		});

		test('應該要求所有必填欄位', async ({ page }) => {
			await page.goto('/auth/register');
			await page.click('button[type="submit"]');

			// 應該有表單驗證錯誤
			const emailInput = page.locator('input#email');
			await expect(emailInput).toHaveAttribute('required', '');
		});
	});

	test.describe('用戶登入', () => {
		test('應該成功登入已存在的用戶', async ({ page }) => {
			const user = TEST_USERS.user1;

			// 確保用戶存在
			await ensureLoggedIn(page, user);

			// 登出
			await logoutUser(page);

			// 重新登入
			await loginUser(page, user.username, user.password);

			// 應該在首頁
			await expectHomePage(page);
		});

		test('應該拒絕錯誤的密碼', async ({ page }) => {
			const user = TEST_USERS.user1;

			// 確保用戶存在
			await ensureLoggedIn(page, user);
			await logoutUser(page);

			await page.goto('/auth/login');
			await page.waitForLoadState('networkidle');
			await page.fill('input#email', user.username);
			await page.fill('input#password', 'wrongpassword');
			await page.click('button[type="submit"]');

			// 等待錯誤訊息出現
			await page.waitForTimeout(1000);

			// 應該顯示錯誤訊息
			await expectErrorMessage(page, '密碼');
		});

		test('應該拒絕不存在的用戶', async ({ page }) => {
			await page.goto('/auth/login');
			await page.fill('input#email', 'nonexistentuser99999@test.com');
			await page.fill('input#password', 'Test123456!');
			await page.click('button[type="submit"]');

			// 應該顯示錯誤訊息（實際訊息是 "Email 或密碼錯誤"）
			await expectErrorMessage(page, 'Email');
		});
	});

	test.describe('用戶登出', () => {
		test('應該成功登出用戶', async ({ page }) => {
			const user = TEST_USERS.user1;

			// 登入
			await ensureLoggedIn(page, user);

			// 登出
			await logoutUser(page);

			// 應該在登入頁
			await expectLoginPage(page);

			// 嘗試訪問首頁應該重定向到登入頁
			await page.goto('/');
			await expectLoginPage(page);
		});
	});

	test.describe('會話管理', () => {
		test('應該保持用戶會話在頁面重新整理後', async ({ page }) => {
			const user = TEST_USERS.user1;

			// 登入
			await ensureLoggedIn(page, user);

			// 重新整理頁面（使用 goto 而不是 reload 以避免錯誤）
			await page.goto('/');
			await page.waitForLoadState('networkidle');

			// 應該仍然在首頁（保持登入狀態）
			await expectHomePage(page);
		});

		test('未登入用戶訪問首頁應該重定向到登入頁', async ({ page }) => {
			await page.goto('/');
			await expectLoginPage(page);
		});

		test('已登入用戶訪問登入頁應該重定向到首頁', async ({ page }) => {
			const user = TEST_USERS.user1;

			// 登入
			await ensureLoggedIn(page, user);

			// 嘗試訪問登入頁（應該自動重定向到首頁）
			await page.goto('/auth/login', { waitUntil: 'networkidle' });

			// 等待可能的重定向
			await page.waitForTimeout(500);

			// 應該重定向到首頁
			await expectHomePage(page);
		});
	});
});
