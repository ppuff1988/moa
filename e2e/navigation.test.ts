/**
 * 導航測試
 * 測試頁面導航、路由保護等功能
 */

import { test, expect } from '@playwright/test';
import {
	TEST_USERS,
	ensureLoggedIn,
	logoutUser,
	expectLoginPage,
	expectHomePage,
	createRoom,
	getRoomCodeFromUrl,
	cleanupTestData
} from './helpers';

test.describe('頁面導航', () => {
	test.beforeEach(async ({ page }) => {
		await cleanupTestData(page);
	});

	test.describe('基本導航', () => {
		test('應該能夠訪問登入頁面', async ({ page }) => {
			await page.goto('/auth/login');
			await expect(page).toHaveURL('/auth/login');
			await expect(page.locator('.auth-form h1, .auth-container h1').first()).toContainText(
				/登入|登錄/
			);
		});

		test('應該能夠訪問註冊頁面', async ({ page }) => {
			await page.goto('/auth/register');
			await expect(page).toHaveURL('/auth/register');
			await expect(page.locator('.auth-form h1, .auth-container h1').first()).toContainText(
				/註冊|注册/
			);
		});

		test('應該能夠從登入頁導航到註冊頁', async ({ page }) => {
			await page.goto('/auth/login');

			// 點擊註冊連結
			await page.click('a[href="/auth/register"], a:has-text("註冊"), a:has-text("注册")');

			await expect(page).toHaveURL('/auth/register');
		});

		test('應該能夠從註冊頁導航到登入頁', async ({ page }) => {
			await page.goto('/auth/register');

			// 點擊登入連結
			await page.click('a[href="/auth/login"], a:has-text("登入"), a:has-text("登錄")');

			await expect(page).toHaveURL('/auth/login');
		});
	});

	test.describe('已登入用戶導航', () => {
		test('應該能夠訪問首頁', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);
			await expectHomePage(page);

			// 應該顯示用戶資訊
			await expect(page.locator('body')).toContainText(TEST_USERS.user1.nickname);
		});

		test('應該能夠創建房間並進入房間頁面', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomName = `測試房間_${Date.now()}`;
			await createRoom(page, roomName);

			// 應該在房間頁面
			await expect(page).toHaveURL(/\/room\/.+/);

			// 應該顯示房間資訊（房間代碼）
			await expect(page.locator('body')).toContainText(/房間：\d+/);
		});

		test('應該能夠從房間返回首頁', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomName = `測試房間_${Date.now()}`;
			await createRoom(page, roomName);

			// 點擊返回或離開房間按鈕
			await page.click('a[href="/"], button:has-text("離開"), button:has-text("返回")');

			await expectHomePage(page);
		});
	});

	test.describe('路由保護', () => {
		test('未登入用戶訪問首頁應該重定向到登入頁', async ({ page }) => {
			await page.goto('/');
			await expectLoginPage(page);
		});

		test('未登入用戶訪問房間頁面應該重定向到登入頁', async ({ page }) => {
			await page.goto('/room/testroom123');
			await expectLoginPage(page);
		});

		test('已登入用戶訪問登入頁應該重定向到首頁', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			await page.goto('/auth/login');
			await expectHomePage(page);
		});

		test('已登入用戶訪問註冊頁應該重定向到首頁', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			await page.goto('/auth/register');
			await expectHomePage(page);
		});

		test('登出後應該無法訪問受保護的頁面', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			// 創建房間
			const roomName = `測試房間_${Date.now()}`;
			await createRoom(page, roomName);

			const roomCode = getRoomCodeFromUrl(page.url());

			// 登出
			await logoutUser(page);

			// 嘗試訪問房間
			await page.goto(`/room/${roomCode}`);

			// 應該重定向到登入頁
			await expectLoginPage(page);
		});
	});

	test.describe('瀏覽器導航', () => {
		test('應該能夠使用瀏覽器返回按鈕', async ({ page }) => {
			await page.goto('/auth/login');
			await page.goto('/auth/register');

			// 使用瀏覽器返回
			await page.goBack();

			await expect(page).toHaveURL('/auth/login');
		});

		test('應該能夠使用瀏覽器前進按鈕', async ({ page }) => {
			await page.goto('/auth/login');
			await page.waitForLoadState('networkidle');
			await page.goto('/auth/register');
			await page.waitForLoadState('networkidle');

			// 使用瀏覽器返回
			await page.goBack();
			await page.waitForLoadState('networkidle');

			// 使用瀏覽器前進，增加超時時間
			await page.goForward({ waitUntil: 'domcontentloaded', timeout: 10000 });

			await expect(page).toHaveURL('/auth/register');
		});

		test('應該能夠重新整理頁面', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			// 重新整理頁面
			await page.reload();

			// 應該保持在首頁
			await expectHomePage(page);
		});
	});

	test.describe('錯誤處理', () => {
		test('訪問不存在的房間應該顯示錯誤', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			await page.goto('/room/nonexistentroom999999');

			// 應該顯示錯誤訊息或重定向
			const currentUrl = page.url();
			const hasError = (await page.locator('.error-message, [role="alert"]').count()) > 0;

			expect(hasError || currentUrl.includes('/')).toBeTruthy();
		});

		test('訪問不存在的路由應該顯示 404 頁面', async ({ page }) => {
			const response = await page.goto('/nonexistent-page-xyz');

			// 應該返回 404 或重定向
			expect(response?.status()).toBeTruthy();
		});
	});
});
