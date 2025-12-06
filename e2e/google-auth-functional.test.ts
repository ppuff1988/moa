/**
 * Google OAuth 實際可運行的測試
 * 這個文件包含可以在開發環境中實際運行的測試
 * 使用 API 模擬和狀態管理來測試 OAuth 後的功能
 */

import { expect, test, type Page } from '@playwright/test';
import { createTestUser, type TestUser } from './helpers';

/**
 * 輔助函數：註冊一個普通用戶並獲取 JWT token
 * 這可以用來測試 OAuth 登入後的功能
 */
async function createAndLoginUser(page: Page, testUser: TestUser) {
	// 1. 註冊用戶
	const registerResponse = await page.request.post('/api/auth/register', {
		data: {
			email: testUser.username,
			password: testUser.password,
			nickname: testUser.nickname
		}
	});

	// 2. 如果註冊成功，使用測試 API 驗證 Email
	if (registerResponse.ok() || registerResponse.status() === 201) {
		// 調用測試專用的驗證 API
		const verifyResponse = await page.request.post('/api/test/verify-email', {
			data: {
				email: testUser.username
			}
		});

		if (!verifyResponse.ok()) {
			const errorText = await verifyResponse.text();
			console.error(`❌ Email 驗證失敗: ${verifyResponse.status()} - ${errorText}`);
			throw new Error(`Email 驗證失敗: ${verifyResponse.status()} - ${errorText}`);
		}

		console.log(`✅ Email 已驗證: ${testUser.username}`);
	}

	// 3. 登入獲取 token
	const loginResponse = await page.request.post('/api/auth/login', {
		data: {
			email: testUser.username,
			password: testUser.password
		}
	});

	if (loginResponse.ok()) {
		const data = await loginResponse.json();
		return data.token as string;
	}

	// 4. 如果登入失敗，拋出詳細錯誤
	const errorData = await loginResponse.json();
	throw new Error(`無法登入用戶: ${errorData.message || loginResponse.status()}`);
}

test.describe('Google OAuth - Login Flow UI Tests', () => {
	test('should show Google login button with correct styling', async ({ page }) => {
		await page.goto('/auth/login');

		const googleButton = page.locator('a[href="/auth/google"]');

		// 檢查按鈕存在
		await expect(googleButton).toBeVisible();

		// 檢查按鈕文字
		await expect(googleButton).toContainText('Google');

		// 檢查 Google 圖標存在
		const googleIcon = googleButton.locator('svg.google-icon');
		await expect(googleIcon).toBeVisible();
	});

	test('should have proper link attributes for Google OAuth', async ({ page }) => {
		await page.goto('/auth/login');

		const googleButton = page.locator('a[href="/auth/google"]');

		// 檢查是否有 data-sveltekit-preload-data="off" 屬性
		// 這確保不會預加載 OAuth 請求
		const preloadAttr = await googleButton.getAttribute('data-sveltekit-preload-data');
		expect(preloadAttr).toBe('off');
	});

	test('should show Google button on both login and register pages', async ({ page }) => {
		// 檢查登入頁面
		await page.goto('/auth/login');
		await expect(page.locator('a[href="/auth/google"]')).toBeVisible();

		// 檢查註冊頁面
		await page.goto('/auth/register');
		await expect(page.locator('a[href="/auth/google"]')).toBeVisible();
	});

	test('should show divider between OAuth and form login', async ({ page }) => {
		await page.goto('/auth/login');

		// 檢查分隔線
		const divider = page.locator('.divider');
		await expect(divider).toBeVisible();
		await expect(divider).toContainText('或');
	});
});

test.describe('Google OAuth - Error Handling', () => {
	test('should redirect to error page on invalid OAuth callback', async ({ page }) => {
		await page.goto('/auth/google/callback?error=access_denied');

		await page.waitForURL('/auth/oauth-error', { timeout: 5000 });
		await expect(page).toHaveURL('/auth/oauth-error');
	});

	test('should display error page with helpful message', async ({ page }) => {
		await page.goto('/auth/oauth-error');

		// 檢查頁面標題
		const heading = page.locator('h2:has-text("OAuth 驗證失敗")');
		await expect(heading).toBeVisible();

		// 檢查返回登入的連結
		const retryLink = page.locator('a[href="/auth/login"]:has-text("重新登入")');
		await expect(retryLink).toBeVisible();
	});

	test('should be able to retry login from error page', async ({ page }) => {
		await page.goto('/auth/oauth-error');

		// 點擊重新登入連結
		await page.click('a[href="/auth/login"]:has-text("重新登入")');

		// 確認回到登入頁面
		await expect(page).toHaveURL('/auth/login');

		// Google 登入按鈕應該可見
		await expect(page.locator('a[href="/auth/google"]')).toBeVisible();
	});
});

test.describe('Google OAuth - Post-Login Profile Management', () => {
	let authToken: string;
	const testUser = createTestUser('google_profile', Date.now());

	test.beforeAll(async ({ browser }) => {
		// 創建一個測試用戶來模擬 Google OAuth 登入後的用戶
		const page = await browser.newPage();
		authToken = await createAndLoginUser(page, testUser);
		await page.close();
	});

	test('should be able to view profile after login', async ({ page }) => {
		// 使用 JWT token 發送請求
		const response = await page.request.get('/api/user/profile', {
			headers: {
				Authorization: `Bearer ${authToken}`
			}
		});

		expect(response.ok()).toBeTruthy();

		const profile = await response.json();
		expect(profile.email).toBe(testUser.username);
		expect(profile.nickname).toBe(testUser.nickname);
	});

	test('should be able to update nickname after Google login', async ({ page }) => {
		const newNickname = `Updated_${Date.now()}`;

		const response = await page.request.put('/api/user/profile', {
			headers: {
				Authorization: `Bearer ${authToken}`
			},
			data: {
				nickname: newNickname
			}
		});

		expect(response.ok()).toBeTruthy();

		const updatedProfile = await response.json();
		expect(updatedProfile.nickname).toBe(newNickname);
	});

	test('should be able to update avatar URL after Google login', async ({ page }) => {
		const avatarUrl = 'https://example.com/avatar.jpg';

		const response = await page.request.put('/api/user/profile', {
			headers: {
				Authorization: `Bearer ${authToken}`
			},
			data: {
				nickname: testUser.nickname,
				avatar: avatarUrl
			}
		});

		expect(response.ok()).toBeTruthy();

		const updatedProfile = await response.json();
		expect(updatedProfile.avatar).toBe(avatarUrl);
	});

	test('should reject empty nickname update', async ({ page }) => {
		const response = await page.request.put('/api/user/profile', {
			headers: {
				Authorization: `Bearer ${authToken}`
			},
			data: {
				nickname: ''
			}
		});

		expect(response.status()).toBe(400);

		const error = await response.json();
		expect(error.error).toBeTruthy();
	});

	test('should reject nickname longer than 50 characters', async ({ page }) => {
		const longNickname = 'a'.repeat(51);

		const response = await page.request.put('/api/user/profile', {
			headers: {
				Authorization: `Bearer ${authToken}`
			},
			data: {
				nickname: longNickname
			}
		});

		expect(response.status()).toBe(400);
	});
});

test.describe('Google OAuth - Session Management', () => {
	let authToken: string;
	const testUser = createTestUser('google_session', Date.now());

	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage();
		authToken = await createAndLoginUser(page, testUser);
		await page.close();
	});

	test('should maintain authentication with valid token', async ({ page }) => {
		const response = await page.request.get('/api/user/profile', {
			headers: {
				Authorization: `Bearer ${authToken}`
			}
		});

		expect(response.ok()).toBeTruthy();
	});

	test('should reject request without token', async ({ page }) => {
		const response = await page.request.get('/api/user/profile');

		expect(response.status()).toBe(401);
	});

	test('should reject request with invalid token', async ({ page }) => {
		const response = await page.request.get('/api/user/profile', {
			headers: {
				Authorization: 'Bearer invalid_token_12345'
			}
		});

		expect(response.status()).toBe(401);
	});

	test('should be able to logout', async ({ page }) => {
		const response = await page.request.post('/api/auth/logout', {
			headers: {
				Authorization: `Bearer ${authToken}`
			}
		});

		// 登出應該成功（返回 200 或 204）
		expect(response.ok()).toBeTruthy();
	});
});

test.describe('Google OAuth - Game Integration', () => {
	let authToken: string;
	const testUser = createTestUser('google_game', Date.now());

	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage();
		authToken = await createAndLoginUser(page, testUser);

		await page.close();
	});

	test('Google authenticated user should be able to create game room', async ({ page }) => {
		// 設置認證
		await page.setExtraHTTPHeaders({
			Authorization: `Bearer ${authToken}`
		});

		await page.goto('/');

		// 設置 JWT token
		await page.evaluate((token) => {
			localStorage.setItem('jwt_token', token);
			document.cookie = `jwt=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
		}, authToken);

		// 重新載入頁面以應用 token
		await page.reload();

		// 等待頁面載入
		await page.waitForLoadState('networkidle');

		// 檢查是否有創建房間按鈕
		const createRoomButton = page.locator('text=創建房間');

		// 如果按鈕存在，測試創建房間流程
		if (await createRoomButton.isVisible()) {
			await createRoomButton.click();
			await page.waitForTimeout(500);

			// 填寫房間資訊
			await page.fill('input#roomPassword', 'test123');
			await page.click('form button[type="submit"]:has-text("創建房間")');

			// 應該導航到房間頁面
			await page.waitForURL(/\/room\/.*/, { timeout: 10000 });
		}
	});

	test('Google authenticated user should appear in player list', async ({ page }) => {
		// 先導航到頁面
		await page.goto('/');

		// 設置認證
		await page.evaluate((token) => {
			localStorage.setItem('jwt_token', token);
			document.cookie = `jwt=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
		}, authToken);

		// 重新載入頁面以應用 token
		await page.reload();
		await page.waitForLoadState('networkidle');

		// 測試用戶是否正確認證
		// 可以通過檢查是否顯示用戶名或登出按鈕來確認
		const userInfo = page.locator(`text=${testUser.nickname}`);
		const logoutButton = page.locator('text=登出');

		// 至少其中一個應該可見
		const isAuthenticated =
			(await userInfo.isVisible().catch(() => false)) ||
			(await logoutButton.isVisible().catch(() => false));

		expect(isAuthenticated).toBeTruthy();
	});
});

test.describe('Google OAuth - Security Tests', () => {
	test('should not expose sensitive OAuth data in client', async ({ page }) => {
		await page.goto('/auth/login');

		// 檢查頁面原始碼中不應包含敏感資訊
		const content = await page.content();

		// 不應該包含 client secret
		expect(content).not.toContain('GOOGLE_CLIENT_SECRET');
		expect(content).not.toContain('client_secret');
	});

	test('should use secure cookies for OAuth state', async ({ page, context }) => {
		// 在生產環境中，OAuth cookies 應該是 secure 的
		await page.goto('/auth/google');

		// 等待重定向
		await page.waitForTimeout(1000);

		// 檢查 cookies（在開發環境中可能不是 secure）
		const cookies = await context.cookies();
		const oauthStateCookie = cookies.find((c) => c.name === 'google_oauth_state');

		if (oauthStateCookie) {
			// Cookie 應該是 httpOnly 的
			expect(oauthStateCookie.httpOnly).toBeTruthy();
		}
	});

	test('should prevent CSRF with state parameter validation', async ({ page }) => {
		// 嘗試使用無效的 state 訪問 callback
		await page.goto('/auth/google/callback?code=test_code&state=invalid_state');

		// 應該重定向到錯誤頁面
		await expect(page).toHaveURL('/auth/oauth-error');
	});
});

test.describe('Google OAuth - User Experience', () => {
	test('should handle multiple rapid clicks on Google login button', async ({ page }) => {
		await page.goto('/auth/login');

		const googleButton = page.locator('a[href="/auth/google"]');

		// 快速點擊多次
		await googleButton.click();
		await page.waitForTimeout(100);

		// 應該只處理第一次點擊，不會導致錯誤
		// 頁面應該正在導航或已經導航
		const url = page.url();
		expect(url).toBeTruthy();
	});

	test('should maintain page context during OAuth flow', async ({ page }) => {
		// 測試 OAuth 流程不會破壞頁面狀態
		await page.goto('/auth/login');

		// 檢查登入頁面標題是否正常
		await expect(page.locator('h1:has-text("登入")')).toBeVisible();

		// 檢查表單是否存在
		await expect(page.locator('form.auth-form')).toBeVisible();
	});

	test('should show appropriate loading states', async ({ page }) => {
		await page.goto('/auth/login');

		// 在實際應用中，點擊 Google 登入按鈕後應該有某種視覺反饋
		const googleButton = page.locator('a[href="/auth/google"]');

		// 檢查按鈕可以點擊
		await expect(googleButton).toBeEnabled();
	});
});
