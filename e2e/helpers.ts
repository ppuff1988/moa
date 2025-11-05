/**
 * E2E 測試輔助函數
 * 包含所有測試檔案共用的工具函數，避免重複程式碼
 */

import { expect, type Page } from '@playwright/test';

/**
 * 測試用戶類型
 */
export interface TestUser {
	username: string;
	password: string;
	nickname: string;
}

/**
 * 測試用戶憑證
 */
export const TEST_USERS = {
	user1: {
		username: 'testuser1@test.com',
		password: 'Test123456!',
		nickname: '測試玩家1'
	},
	user2: {
		username: 'testuser2@test.com',
		password: 'Test123456!',
		nickname: '測試玩家2'
	},
	user3: {
		username: 'testuser3@test.com',
		password: 'Test123456!',
		nickname: '測試玩家3'
	},
	user4: {
		username: 'testuser4@test.com',
		password: 'Test123456!',
		nickname: '測試玩家4'
	},
	user5: {
		username: 'testuser5@test.com',
		password: 'Test123456!',
		nickname: '測試玩家5'
	},
	user6: {
		username: 'testuser6@test.com',
		password: 'Test123456!',
		nickname: '測試玩家6'
	}
};

/**
 * 創建測試用戶
 */
export function createTestUser(prefix: string, timestamp: number): TestUser {
	return {
		username: `${prefix}_${timestamp}@test.com`,
		password: 'Test123456!',
		nickname: `測試_${prefix}_${timestamp}`
	};
}

/**
 * 註冊新用戶
 */
export async function registerUser(
	page: Page,
	username: string,
	password: string,
	nickname: string
) {
	await page.goto('/auth/register');
	await page.waitForLoadState('networkidle');
	await page.fill('input#nickname', nickname);
	await page.fill('input#email', username);
	await page.fill('input#password', password);
	await page.fill('input#confirmPassword', password);
	await page.click('button[type="submit"]');
	await page.waitForURL('/', { timeout: 15000 });
}

/**
 * 登入用戶
 */
export async function loginUser(page: Page, username: string, password: string) {
	await page.goto('/auth/login');
	await page.waitForLoadState('networkidle');
	await page.fill('input#email', username);
	await page.fill('input#password', password);
	await page.click('button[type="submit"]');
	await page.waitForURL('/');
}

/**
 * 註冊並登入用戶（組合函數）
 */
export async function registerAndLogin(page: Page, user: TestUser) {
	try {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded', timeout: 20000 });

		const bodyText = await page.locator('body').textContent();

		if (!bodyText || bodyText.length < 10) {
			throw new Error('頁面載入失敗');
		}

		await page.fill('input#nickname', user.nickname);
		await page.fill('input#email', user.username);
		await page.fill('input#password', user.password);
		await page.fill('input#confirmPassword', user.password);

		await page.click('button[type="submit"]');

		// 等待導航完成
		await page.waitForURL('/', { timeout: 10000 });

		// 確保首頁元素已載入
		await page.locator('button:has-text("創建房間")').waitFor({ timeout: 5000 });
		return;
	} catch {
		// 註冊失敗或已存在，繼續嘗試登入
	}

	// 如果註冊失敗或用戶已存在，嘗試登入
	await page.goto('/auth/login', { waitUntil: 'domcontentloaded', timeout: 20000 });

	// 檢查是否被重定向到首頁（已經登入）
	if (
		page.url() === 'http://localhost:5173/' ||
		(page.url().endsWith('/') && !page.url().includes('/auth/'))
	) {
		await page.locator('button:has-text("創建房間")').waitFor({ timeout: 5000 });
		return;
	}

	const loginBodyText = await page.locator('body').textContent();

	if (!loginBodyText || loginBodyText.length < 10) {
		await page.screenshot({ path: `test-results/debug-blank-page-${Date.now()}.png` });
		throw new Error('登入頁面為空白，無法繼續');
	}

	await page.fill('input#email', user.username);
	await page.fill('input#password', user.password);

	await page.click('button[type="submit"]');

	await page.waitForURL('/', { timeout: 10000 });

	// 確保首頁元素已載入
	await page.locator('button:has-text("創建房間")').waitFor({ timeout: 5000 });
}

/**
 * 登出用戶
 */
export async function logoutUser(page: Page) {
	// 點擊登出按鈕（可能在導航欄或用戶菜單中）
	const logoutButton = page.locator('button:has-text("登出"), a:has-text("登出")');
	if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
		await logoutButton.click();
		await page.waitForURL('/auth/login', { timeout: 5000 });
	}

	// 手動清除 JWT token 和相關 cookies，確保完全登出
	await page.evaluate(() => {
		localStorage.removeItem('jwt_token');
		// 清除所有 cookies
		document.cookie.split(';').forEach((c) => {
			document.cookie = c
				.replace(/^ +/, '')
				.replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
		});
	});

	// 確保在登入頁
	await page.goto('/auth/login');
	await page.waitForLoadState('networkidle');
}

/**
 * 確保用戶已登入（如果未登入則註冊並登入）
 */
export async function ensureLoggedIn(page: Page, user: TestUser) {
	// 嘗試訪問首頁，如果重定向到登入頁則需要登入
	await page.goto('/');
	await page.waitForLoadState('domcontentloaded');

	// 等待一下讓頁面完全載入
	await page.waitForTimeout(500);

	// 檢查是否在登入頁
	const currentUrl = page.url();
	if (currentUrl.includes('/auth/login')) {
		// 等待登入表單出現
		await page.waitForSelector('input#email', { state: 'visible', timeout: 5000 });

		// 嘗試登入
		try {
			await page.fill('input#email', user.username);
			await page.fill('input#password', user.password);
			await page.click('button[type="submit"]');
			await page.waitForURL('/', { timeout: 10000 });

			// 簡短等待以確保 token 設置完成
			await page.waitForTimeout(500);
		} catch {
			// 登入失敗，可能是用戶不存在，嘗試註冊
			try {
				await page.goto('/auth/register');
				await page.waitForLoadState('domcontentloaded');
				await page.waitForSelector('input#nickname', { state: 'visible', timeout: 5000 });
				await page.fill('input#nickname', user.nickname);
				await page.fill('input#email', user.username);
				await page.fill('input#password', user.password);
				await page.fill('input#confirmPassword', user.password);
				await page.click('button[type="submit"]');
				await page.waitForURL('/', { timeout: 10000 });
				await page.waitForTimeout(500);
			} catch {
				// 註冊失敗（可能是用戶已存在），再次嘗試登入
				await page.goto('/auth/login');
				await page.waitForLoadState('domcontentloaded');
				await page.waitForSelector('input#email', { state: 'visible', timeout: 5000 });
				await page.fill('input#email', user.username);
				await page.fill('input#password', user.password);
				await page.click('button[type="submit"]');
				await page.waitForURL('/', { timeout: 10000 });
				await page.waitForTimeout(500);
			}
		}
	}

	// 確認在首頁並等待關鍵元素
	await page.waitForSelector('button:has-text("創建房間"), button:has-text("回到房間")', {
		state: 'visible',
		timeout: 10000
	});

	// 檢查用戶是否在遊戲中（如果有「離開房間」按鈕）
	const hasLeaveButton = await page
		.locator('button:has-text("離開房間")')
		.isVisible({ timeout: 1000 })
		.catch(() => false);

	if (hasLeaveButton) {
		// 用戶在遊戲中，先離開房間
		await page.click('button:has-text("離開房間")');

		// 等待確認對話框出現並確認
		const confirmButton = page.locator('button:has-text("確認離開"), button:has-text("確定")');
		const isConfirmVisible = await confirmButton.isVisible({ timeout: 1000 }).catch(() => false);

		if (isConfirmVisible) {
			await confirmButton.click();
			await page.waitForTimeout(500);
		}

		// 等待回到首頁並確保顯示創建房間按鈕
		await page.waitForSelector('button:has-text("創建房間")', {
			state: 'visible',
			timeout: 5000
		});
	}
}

/**
 * 期望當前頁面是登入頁
 */
export async function expectLoginPage(page: Page) {
	await expect(page).toHaveURL(/\/auth\/login/);
	await expect(page.locator('input#email, input[name="username"]')).toBeVisible();
}

/**
 * 期望當前頁面是首頁
 */
export async function expectHomePage(page: Page) {
	// 等待 URL 變為首頁
	await page.waitForURL('/', { timeout: 10000 });

	// 等待頁面載入完成
	await page.waitForLoadState('networkidle', { timeout: 10000 });

	// 檢查首頁的特定元素（創建房間或回到房間按鈕）
	const hasCreateButton = await page
		.locator('button:has-text("創建房間"), button:has-text("回到房間")')
		.first()
		.isVisible({ timeout: 10000 })
		.catch(() => false);

	if (!hasCreateButton) {
		// 如果找不到按鈕，打印頁面內容以便調試
		const bodyText = await page.locator('body').textContent();
		console.log('頁面內容:', bodyText?.substring(0, 500));
		throw new Error('首頁載入失敗：找不到創建房間或回到房間按鈕');
	}

	await expect(page).toHaveURL('/');
}

/**
 * 創建房間
 */
export async function createRoom(page: Page, roomPassword: string) {
	await page.goto('/');

	// 等待創建房間按鈕出現
	await page.waitForSelector('button:has-text("創建房間")', {
		state: 'visible',
		timeout: 10000
	});

	await page.click('button:has-text("創建房間")');

	// 等待房間密碼輸入框出現
	await page.waitForSelector('#roomPassword', { state: 'visible', timeout: 5000 });
	await page.fill('#roomPassword', roomPassword);
	await page.click('button[type="submit"]');

	// 等待跳轉到房間頁面
	await page.waitForURL(/\/room\/.+/, { timeout: 10000 });
}

/**
 * 加入房間
 */
export async function joinRoom(page: Page, roomCode: string, roomPassword: string = '') {
	await page.goto('/');
	await page.click('button:has-text("加入房間")');
	await page.waitForSelector('#roomName', { timeout: 3000 });
	await page.fill('#roomName', roomCode);
	if (roomPassword) {
		await page.fill('#roomPassword', roomPassword);
	}
	await page.click('button[type="submit"]');
	await page.waitForURL(/\/room\/.+/, { timeout: 8000 });
}

/**
 * 從 URL 獲取房間代碼
 */
export function getRoomCodeFromUrl(url: string): string {
	const match = url.match(/\/room\/([^/]+)/);
	return match ? match[1] : '';
}

/**
 * 等待房間載入完成
 */
export async function waitForRoomReady(page: Page) {
	await page.waitForSelector('[data-testid="lobby-container"]', {
		timeout: 10000
	});
	// 額外等待房間資料載入完成
	await page.waitForSelector('[data-testid="room-info"]', {
		timeout: 10000
	});
}

/**
 * 獲取房間內的玩家列表
 */
export async function getPlayersInRoom(page: Page): Promise<string[]> {
	return await page.$$eval('[data-testid="player-item"], .player-item', (elements) =>
		elements.map((el) => el.textContent?.trim() || '')
	);
}

/**
 * 開始遊戲（房主操作）
 */
export async function startGame(page: Page) {
	await page.click('button:has-text("開始遊戲")');
	await page.waitForSelector('[data-testid="game-board"], .game-board', {
		timeout: 5000
	});
}

/**
 * 清理測試資料
 */
export async function cleanupTestData(page: Page) {
	try {
		// 先導航到一個有效的頁面，避免 localStorage SecurityError
		await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

		// 清除所有存儲
		await page.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
			// 清除所有 cookies
			document.cookie.split(';').forEach((c) => {
				document.cookie = c
					.replace(/^ +/, '')
					.replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
			});
		});

		// 使用 Playwright 的 API 清除上下文中的所有 cookies
		await page.context().clearCookies();
	} catch {
		// 如果清理失敗，靜默忽略（可能是頁面還未載入）
	}
}

/**
 * 等待元素包含文字
 */
export async function waitForText(page: Page, selector: string, text: string) {
	await page.waitForSelector(selector);
	await expect(page.locator(selector)).toContainText(text);
}

/**
 * 截圖（用於除錯）
 */
export async function takeScreenshot(page: Page, name: string) {
	await page.screenshot({ path: `test-results/${name}-${Date.now()}.png` });
}

/**
 * 檢查錯誤訊息
 */
export async function expectErrorMessage(page: Page, message: string) {
	const errorLocator = page.locator(
		'.error-message, [role="alert"], .alert-error, .error, .toast-error'
	);

	// 等待錯誤訊息出現
	await errorLocator.first().waitFor({ state: 'visible', timeout: 10000 });

	// 檢查錯誤訊息包含預期文本
	await expect(errorLocator).toContainText(message);
}
