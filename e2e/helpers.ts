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
 * 批量創建測試用戶（直接寫入資料庫）
 * 適用於需要大量測試帳號的場景，比手動註冊快很多
 */
export async function createTestUsersInDatabase(page: Page, users: TestUser[]): Promise<void> {
	console.log(`📝 正在批量創建 ${users.length} 個測試帳號...`);

	const response = await page.request.post('http://localhost:5173/api/test/create-users', {
		data: {
			users: users.map((u) => ({
				email: u.username,
				password: u.password,
				nickname: u.nickname
			}))
		}
	});

	if (response.ok()) {
		const result = await response.json();
		console.log(
			`✅ 批量創建完成: 新建 ${result.created.length} 個，已存在 ${result.existing.length} 個`
		);
	} else {
		const error = await response.text();
		console.error('❌ 批量創建失敗:', error);
		throw new Error(`批量創建用戶失敗: ${error}`);
	}
}

/**
 * 註冊新用戶（註冊後會顯示驗證郵件訊息，不會自動登入）
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

	// 勾選同意條款
	await page.check('input[type="checkbox"]');

	await page.click('button[type="submit"]');

	// 等待成功訊息出現（註冊成功但需要驗證郵件）
	await page.waitForTimeout(1000);
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
 * 註冊並自動驗證用戶（測試專用）
 */
export async function registerAndVerifyUser(
	page: Page,
	username: string,
	password: string,
	nickname: string
) {
	// 註冊用戶
	await page.goto('/auth/register');
	await page.waitForLoadState('networkidle');
	await page.fill('input#nickname', nickname);
	await page.fill('input#email', username);
	await page.fill('input#password', password);
	await page.fill('input#confirmPassword', password);
	await page.check('input[type="checkbox"]');
	await page.click('button[type="submit"]');

	// 等待註冊成功訊息
	await page.waitForTimeout(1000);

	// 使用測試 API 驗證用戶
	const response = await page.request.post('http://localhost:5173/api/test/verify-user', {
		data: { email: username }
	});

	if (!response.ok()) {
		console.warn('自動驗證失敗:', await response.text());
	} else {
		console.log('✅ 用戶已驗證:', username);
	}
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

		// 勾選同意條款
		await page.check('input[type="checkbox"]');

		// 點擊提交並等待 API 回應
		try {
			const [registerResponse] = await Promise.all([
				page.waitForResponse((resp) => resp.url().includes('/api/auth/register'), {
					timeout: 10000
				}),
				page.click('button[type="submit"]')
			]);

			// 註冊成功後，自動驗證 Email
			if (registerResponse.status() === 201) {
				console.log('註冊成功，正在驗證 Email...');
				await page.request.post('http://localhost:5173/api/test/verify-user', {
					data: { email: user.username }
				});
				console.log('✅ Email 已驗證');
			} else {
				// 註冊失敗（用戶已存在），繼續嘗試登入
				console.log('註冊失敗（用戶可能已存在），嘗試登入...');
			}
		} catch (error) {
			// 註冊可能失敗（用戶已存在），繼續嘗試登入
			console.log('註冊過程出錯:', error);
		}
	} catch (e) {
		// 註冊失敗或已存在，繼續嘗試登入
		console.log('註冊過程出錯:', e);
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

	// 等待登入表單載入
	await page.waitForSelector('input#email', { timeout: 5000 });

	await page.fill('input#email', user.username);
	await page.fill('input#password', user.password);

	// 點擊提交並等待導航
	await Promise.all([
		page.waitForResponse(
			(resp) => resp.url().includes('/api/auth/login') && resp.status() === 200,
			{ timeout: 10000 }
		),
		page.click('button[type="submit"]')
	]);

	// 等待導航完成
	await page.waitForURL('/', { timeout: 15000 });

	// 確保首頁元素已載入
	await page.locator('button:has-text("創建房間")').waitFor({ timeout: 10000 });
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
	await page.waitForTimeout(1000);

	// 檢查是否在登入頁
	const currentUrl = page.url();
	if (currentUrl.includes('/auth/login')) {
		// 等待登入表單出現
		await page.waitForSelector('input#email', { state: 'visible', timeout: 5000 });

		// 嘗試登入
		try {
			await page.fill('input#email', user.username);
			await page.fill('input#password', user.password);

			// 點擊提交並等待響應和導航
			const [response] = await Promise.all([
				page.waitForResponse((resp) => resp.url().includes('/api/auth/login'), { timeout: 10000 }),
				page.click('button[type="submit"]')
			]);

			// 如果是 403 且需要驗證，則驗證後重試
			if (response.status() === 403) {
				const responseData = await response.json();
				if (responseData.requiresVerification) {
					console.log('用戶未驗證，正在驗證...');
					await page.request.post('http://localhost:5173/api/test/verify-user', {
						data: { email: user.username }
					});

					// 重新登入
					await page.goto('/auth/login');
					await page.waitForLoadState('domcontentloaded');
					await page.waitForSelector('input#email', { state: 'visible', timeout: 5000 });
					await page.fill('input#email', user.username);
					await page.fill('input#password', user.password);

					await Promise.all([
						page.waitForURL('/', { timeout: 15000 }),
						page.click('button[type="submit"]')
					]);
				} else {
					throw new Error(`登入失敗: ${responseData.message || '未知錯誤'}`);
				}
			} else if (response.status() === 200) {
				// 等待頁面跳轉到首頁
				await page.waitForURL('/', { timeout: 15000 });
			} else if (response.status() === 401) {
				// 用戶不存在或密碼錯誤，嘗試註冊
				throw new Error('USER_NOT_FOUND');
			} else {
				const responseData = await response.json();
				throw new Error(`登入失敗 (${response.status()}): ${responseData.message || '未知錯誤'}`);
			}

			// 等待首頁載入完成
			await page.waitForLoadState('networkidle', { timeout: 10000 });
			await page.waitForTimeout(500);
		} catch (loginError) {
			// 登入失敗，可能是用戶不存在，嘗試註冊
			console.log('登入失敗，嘗試註冊新用戶:', loginError);

			try {
				await page.goto('/auth/register');
				await page.waitForLoadState('domcontentloaded');
				await page.waitForSelector('input#nickname', { state: 'visible', timeout: 5000 });
				await page.fill('input#nickname', user.nickname);
				await page.fill('input#email', user.username);
				await page.fill('input#password', user.password);
				await page.fill('input#confirmPassword', user.password);

				// 勾選同意條款
				await page.check('input[type="checkbox"]');

				await Promise.all([
					page.waitForResponse((resp) => resp.url().includes('/api/auth/register'), {
						timeout: 10000
					}),
					page.click('button[type="submit"]')
				]);

				// 等待註冊完成
				await page.waitForTimeout(1000);

				// 自動驗證
				console.log('註冊成功，正在驗證用戶...');
				await page.request.post('http://localhost:5173/api/test/verify-user', {
					data: { email: user.username }
				});
				console.log('用戶驗證成功');

				// 登入
				await page.goto('/auth/login');
				await page.waitForLoadState('domcontentloaded');
				await page.waitForSelector('input#email', { state: 'visible', timeout: 5000 });
				await page.fill('input#email', user.username);
				await page.fill('input#password', user.password);

				await Promise.all([
					page.waitForURL('/', { timeout: 15000 }),
					page.click('button[type="submit"]')
				]);

				// 等待首頁載入完成
				await page.waitForLoadState('networkidle', { timeout: 10000 });
				await page.waitForTimeout(500);
			} catch (registerError) {
				console.error('註冊和登入都失敗:', registerError);
				// 拍張截圖以便調試
				await page.screenshot({ path: `test-results/ensure-logged-in-failed-${Date.now()}.png` });
				throw registerError;
			}
		}
	}

	// 確認在首頁並等待關鍵元素（ActionButton 的文字在 button 標籤內）
	// 先確保 URL 是首頁
	if (!page.url().includes('localhost:5173/') || page.url().includes('/auth/')) {
		console.log('當前不在首頁，正在導航...');
		await page.goto('/');
		await page.waitForLoadState('networkidle', { timeout: 10000 });
		await page.waitForTimeout(1000);
	}

	// 等待首頁的載入狀態結束
	const loadingSpinner = page.locator('text=載入中');
	const isLoadingVisible = await loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false);
	if (isLoadingVisible) {
		await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
	}

	// 等待按鈕出現
	await page.waitForSelector('button.action-btn, button:has-text("離開房間")', {
		state: 'visible',
		timeout: 15000
	});

	// 檢查用戶是否在遊戲中（如果有「離開房間」按鈕）
	const hasLeaveButton = await page
		.locator('button:has-text("離開房間")')
		.isVisible({ timeout: 1000 })
		.catch(() => false);

	if (hasLeaveButton) {
		console.log('用戶在房間中，正在離開...');
		// 用戶在遊戲中，先離開房間
		await page.click('button:has-text("離開房間")');

		// 等待確認對話框出現並確認
		const confirmButton = page.locator('button:has-text("確認離開"), button:has-text("確定")');
		const isConfirmVisible = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);

		if (isConfirmVisible) {
			await confirmButton.click();
			await page.waitForTimeout(1000);
		}

		// 等待回到首頁並確保顯示創建房間按鈕
		await page.waitForSelector('button.action-btn', {
			state: 'visible',
			timeout: 10000
		});
		console.log('已成功離開房間');
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
