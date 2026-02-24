/**
 * E2E 測試輔助函數
 * 包含所有測試檔案共用的工具函數，避免重複程式碼
 */

import { expect, type BrowserContext, type Page } from '@playwright/test';

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
	},
	user7: {
		username: 'testuser7@test.com',
		password: 'Test123456!',
		nickname: '測試玩家7'
	},
	user8: {
		username: 'testuser8@test.com',
		password: 'Test123456!',
		nickname: '測試玩家8'
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
 * 登入用戶（使用原生表單提交）
 */
export async function loginUser(page: Page, username: string, password: string) {
	await page.goto('/auth/login');
	await page.waitForLoadState('networkidle');
	await page.fill('input#email', username);
	await page.fill('input#password', password);
	await page.click('button[type="submit"]');
	await page.waitForURL('/', { timeout: 10000 });
	await page.waitForLoadState('networkidle');
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

	// 點擊提交並等待導航（原生表單提交，POST → 303 重定向到 /）
	await page.click('button[type="submit"]');
	await page.waitForURL('/', { timeout: 15000 });
	await page.waitForLoadState('networkidle');

	// 確保首頁元素已載入
	await page.locator('button:has-text("創建房間")').waitFor({ timeout: 10000 });
}

/**
 * 登出用戶
 */
export async function logoutUser(page: Page) {
	try {
		// 調用登出 API 以無效化 session
		await page.request.post('/api/auth/logout', {});
	} catch (err) {
		console.warn('登出 API 呼叫失敗，繼續清除本地狀態:', err);
	}

	// 手動清除 JWT token、相關 cookies 及 Service Worker 快取
	await page.evaluate(async () => {
		localStorage.removeItem('jwt_token');
		sessionStorage.clear();
		// 清除所有 cookies
		document.cookie.split(';').forEach((c) => {
			document.cookie = c
				.replace(/^ +/, '')
				.replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
		});
		// 取消 Service Worker 註冊以避免快取干擾
		if ('serviceWorker' in navigator) {
			const registrations = await navigator.serviceWorker.getRegistrations();
			for (const registration of registrations) {
				await registration.unregister();
			}
		}
		// 清除所有 Cache Storage
		if ('caches' in window) {
			const cacheNames = await caches.keys();
			for (const cacheName of cacheNames) {
				await caches.delete(cacheName);
			}
		}
	});

	// 使用 Playwright 的 API 清除上下文中的所有 cookies
	await page.context().clearCookies();

	// 確保在登入頁
	await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
	await page.waitForLoadState('networkidle');
}

/**
 * 確保用戶已登入（如果未登入則透過 API 登入，若用戶不存在則自動建立）
 *
 * 使用 API 登入而非表單提交，避免原生表單 303 重定向的時序問題。
 * API 登入會在瀏覽器上下文中設定 auth_session cookie，
 * 後續的 page.goto('/') 即可正常載入已登入的首頁。
 */
export async function ensureLoggedIn(page: Page, user: TestUser) {
	// Step 1: 確保用戶存在並已驗證
	const verifyResp = await page.request.post('http://localhost:5173/api/test/verify-user', {
		data: { email: user.username }
	});

	if (verifyResp.status() === 404) {
		// 用戶不存在，透過測試 API 建立
		console.log('用戶不存在，正在建立:', user.username);
		await createTestUsersInDatabase(page, [user]);
	}

	// Step 2: 清除既有 session 以避免衝突
	await page.context().clearCookies();

	// Step 3: 透過 API 登入（會在瀏覽器上下文中設定 auth_session cookie）
	let loginResp = await page.request.post('http://localhost:5173/api/auth/login', {
		data: { email: user.username, password: user.password }
	});

	if (loginResp.status() === 403) {
		// Email 未驗證，先驗證再重試
		console.log('用戶未驗證，正在驗證:', user.username);
		await page.request.post('http://localhost:5173/api/test/verify-user', {
			data: { email: user.username }
		});
		loginResp = await page.request.post('http://localhost:5173/api/auth/login', {
			data: { email: user.username, password: user.password }
		});
	}

	if (loginResp.status() !== 200) {
		throw new Error(`登入失敗: ${loginResp.status()} ${await loginResp.text()}`);
	}

	// Step 3.5: 將 JWT token 存入 localStorage 及 cookie（socket 連線需要）
	try {
		const loginData = await loginResp.json();
		if (loginData.token) {
			// 先導航到有效頁面再設定 localStorage
			await page.goto('/', { waitUntil: 'domcontentloaded' });
			await page.evaluate((token: string) => {
				localStorage.setItem('jwt_token', token);
				document.cookie = `jwt=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
			}, loginData.token);
		}
	} catch {
		// 如果 JSON 解析失敗，忽略（auth_session cookie 仍然有效）
	}

	// Step 4: 導航到首頁並確認已登入狀態
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	// 等待已登入的 UI 出現
	await page
		.locator('button:has-text("創建房間"), button:has-text("回到房間")')
		.first()
		.waitFor({ state: 'visible', timeout: 10000 });

	console.log('✓ 已確認登入狀態:', user.username);

	// 處理用戶可能在房間中的情況（顯示「回到房間」+「離開房間」）
	const leaveButton = page.locator('button:has-text("離開房間")');
	const hasLeaveButton = await leaveButton.isVisible().catch(() => false);

	if (hasLeaveButton) {
		console.log('用戶在房間中，正在離開...');
		await leaveButton.click();

		// 等待確認對話框出現
		const confirmButton = page.locator('button:has-text("確認離開"), button:has-text("確定")');
		try {
			await confirmButton.first().waitFor({ state: 'visible', timeout: 3000 });
			await confirmButton.first().click();
			await page.waitForTimeout(1000);
		} catch {
			// 如果沒有確認對話框，可能已直接離開
		}

		// 等待回到首頁顯示「創建房間」
		await page.locator('button:has-text("創建房間")').waitFor({ state: 'visible', timeout: 10000 });
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
 * 期望當前頁面是首頁（已登入狀態）
 */
export async function expectHomePage(page: Page) {
	// 等待 URL 變為首頁
	await page.waitForURL('/', { timeout: 10000 });

	// 等待頁面載入完成
	await page.waitForLoadState('networkidle', { timeout: 10000 });

	// 等待已登入 UI 中的「創建房間」或「回到房間」按鈕出現
	try {
		await page
			.locator('button:has-text("創建房間"), button:has-text("回到房間")')
			.first()
			.waitFor({ state: 'visible', timeout: 10000 });
	} catch {
		// 打印頁面內容以便調試
		const bodyText = await page.locator('body').textContent();
		console.log('頁面內容:', bodyText?.substring(0, 500));
		console.log('當前 URL:', page.url());
		throw new Error('首頁載入失敗：找不到創建房間或回到房間按鈕');
	}

	await expect(page).toHaveURL('/');
}

/**
 * 創建房間
 */
export async function createRoom(page: Page, roomPassword: string) {
	await page.goto('/');
	await page.waitForLoadState('networkidle', { timeout: 15000 });

	// 等待創建房間按鈕出現並可點擊
	await page.waitForSelector('button:has-text("創建房間")', {
		state: 'visible',
		timeout: 15000
	});

	await page.waitForTimeout(500); // 確保頁面穩定
	await page.click('button:has-text("創建房間")');

	// 等待房間密碼輸入框出現
	await page.waitForSelector('#roomPassword', { state: 'visible', timeout: 10000 });
	await page.fill('#roomPassword', roomPassword);
	await page.click('button[type="submit"]');

	// 等待跳轉到房間頁面
	await page.waitForURL(/\/room\/.+/, { timeout: 15000 });
	await page.waitForLoadState('networkidle', { timeout: 10000 });
}

/**
 * 加入房間
 */
export async function joinRoom(page: Page, roomCode: string, roomPassword: string = '') {
	await page.goto('/');
	await page.waitForLoadState('networkidle', { timeout: 15000 });

	await page.waitForTimeout(500);
	await page.click('button:has-text("加入房間")');

	await page.waitForSelector('#roomName', { timeout: 10000 });
	await page.fill('#roomName', roomCode);
	if (roomPassword) {
		await page.fill('#roomPassword', roomPassword);
	}
	await page.click('button[type="submit"]');
	await page.waitForURL(/\/room\/.+/, { timeout: 15000 });
	await page.waitForLoadState('networkidle', { timeout: 10000 });
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

		// 清除所有存儲及 Service Worker 快取
		await page.evaluate(async () => {
			localStorage.clear();
			sessionStorage.clear();
			// 清除所有 cookies
			document.cookie.split(';').forEach((c) => {
				document.cookie = c
					.replace(/^ +/, '')
					.replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
			});
			// 取消 Service Worker 註冊
			if ('serviceWorker' in navigator) {
				const registrations = await navigator.serviceWorker.getRegistrations();
				for (const registration of registrations) {
					await registration.unregister();
				}
			}
			// 清除 Cache Storage
			if ('caches' in window) {
				const cacheNames = await caches.keys();
				for (const cacheName of cacheNames) {
					await caches.delete(cacheName);
				}
			}
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
	await expect(errorLocator.first()).toContainText(message);
}

/**
 * 開始選角階段（房主操作）
 */
export async function startRoleSelection(page: Page) {
	// 等待選擇角色按鈕出現
	await page.waitForSelector('button:has-text("選擇角色")', {
		state: 'visible',
		timeout: 10000
	});

	// 點擊選擇角色
	await page.click('button:has-text("選擇角色")');

	// 等待選角介面出現（角色選擇下拉選單）
	await page.waitForSelector(
		'select.selection-dropdown, select:has(option:has-text("請選擇角色"))',
		{
			timeout: 10000
		}
	);

	// 額外等待確保所有玩家的選角介面都已載入
	await page.waitForTimeout(1000);
}

/**
 * 選擇角色並鎖定
 */
export async function selectAndLockRole(page: Page, roleName: string, color: string) {
	// 等待角色選擇下拉選單
	const roleSelect = page.locator('select.selection-dropdown').first();
	await roleSelect.waitFor({ state: 'visible', timeout: 5000 });

	// 選擇角色
	await roleSelect.selectOption({ label: roleName });
	console.log(`選擇角色: ${roleName}`);

	// 等待一下確保選擇已註冊
	await page.waitForTimeout(500);

	// 選擇顏色（使用下拉選單）
	const colorSelect = page.locator('select.color-dropdown, select.selection-dropdown').nth(1);
	if (await colorSelect.isVisible()) {
		// 嘗試根據顏色名稱選擇
		const colorOptions = await colorSelect.locator('option').allTextContents();
		const colorMapping: { [key: string]: string } = {
			red: '紅色',
			blue: '藍色',
			green: '綠色',
			yellow: '黃色',
			purple: '紫色',
			orange: '橙色',
			pink: '粉色',
			cyan: '青色'
		};

		const chineseColor = colorMapping[color.toLowerCase()] || color;
		if (colorOptions.some((opt) => opt.includes(chineseColor))) {
			await colorSelect.selectOption({ label: chineseColor });
		} else {
			// 如果找不到對應的顏色，選擇第一個可用的
			const firstColor = colorOptions.find(
				(c) => c && c !== '請選擇顏色' && c !== '自訂顏色' && c.trim() !== ''
			);
			if (firstColor) {
				await colorSelect.selectOption({ label: firstColor });
			}
		}
		console.log(`選擇顏色: ${chineseColor}`);
	}

	// 等待一下確保選擇已註冊
	await page.waitForTimeout(500);

	// 點擊鎖定按鈕
	const lockButton = page.locator('button.confirm-btn:has-text("鎖定")');
	if (await lockButton.isVisible()) {
		await lockButton.click();
		console.log('已點擊鎖定按鈕');
	}

	// 等待鎖定狀態更新
	await page.waitForTimeout(1000);
}

/**
 * 解鎖角色
 */
export async function unlockRole(page: Page) {
	await page.click('button:has-text("解除鎖定"), button:has-text("取消鎖定")');
	await page.waitForTimeout(500);
}

/**
 * 檢查玩家是否已鎖定
 */
export async function isPlayerLocked(page: Page, playerNickname: string): Promise<boolean> {
	// 找到該玩家的 PlayerCard
	const playerCard = page
		.locator('[data-testid="player-card"], .player-card')
		.filter({ hasText: playerNickname })
		.first();

	// 檢查該玩家卡片中的鎖定狀態圖示
	const lockStatus = playerCard.locator('.lock-status.locked');
	const isLocked = await lockStatus.isVisible({ timeout: 1000 }).catch(() => false);

	if (isLocked) {
		console.log(`✓ 玩家 ${playerNickname} 已鎖定`);
	} else {
		console.log(`✗ 玩家 ${playerNickname} 未鎖定`);
	}

	return isLocked;
}

/**
 * 獲取房間內玩家數量
 */
export async function getPlayerCount(page: Page): Promise<number> {
	return await page.locator('[data-testid="player-card"], .player-card').count();
}

/**
 * 點擊首頁圖示
 */
export async function clickHomeIcon(page: Page) {
	// 找到首頁圖示或連結（返回首頁按鈕）
	const homeIcon = page
		.locator('a.back-home-btn, a[href="/"], [title="返回首頁"], .home-link')
		.first();
	await homeIcon.click();

	// 等待導航到首頁
	await page.waitForURL('/', { timeout: 10000 });

	// 等待首頁載入完成
	await page.waitForTimeout(1000);
}

/**
 * 在首頁點擊離開房間按鈕並確認
 */
export async function confirmLeaveGame(page: Page) {
	// 等待「離開房間」按鈕出現
	const leaveButton = page.locator('button:has-text("離開房間"), .action-btn:has-text("離開房間")');
	await leaveButton.waitFor({ state: 'visible', timeout: 5000 });

	// 點擊離開房間按鈕
	await leaveButton.click();

	// 等待確認對話框出現
	const confirmDialog = page.locator('.modal, [role="dialog"]').filter({ hasText: '確認離開' });
	await confirmDialog.waitFor({ state: 'visible', timeout: 5000 });

	// 點擊確認按鈕
	const confirmButton = confirmDialog
		.locator('button:has-text("確認離開"), button:has-text("確認"), button:has-text("確定")')
		.first();
	await confirmButton.click();

	// 等待處理完成
	await page.waitForTimeout(1000);
}

/**
 * 等待遊戲強制結束的 modal 出現
 */
export async function waitForGameForceEndedModal(page: Page) {
	// 等待強制結束的通知或 modal
	await page.waitForFunction(
		() => {
			return window.confirm || document.querySelector('.modal, [role="dialog"]');
		},
		{ timeout: 10000 }
	);

	// 處理 alert/confirm
	page.on('dialog', async (dialog) => {
		console.log('Dialog message:', dialog.message());
		await dialog.accept();
	});
}

/**
 * 獲取可選角色列表
 */
export async function getAvailableRoles(page: Page): Promise<string[]> {
	// 等待角色選擇下拉選單出現
	const roleSelect = page.locator('select.selection-dropdown').first();
	await roleSelect.waitFor({ state: 'visible', timeout: 5000 });

	// 獲取所有角色選項
	const roleOptions = await roleSelect.locator('option').allTextContents();

	// 過濾掉空選項和「請選擇角色」
	const roles = roleOptions
		.filter((role) => role && role !== '請選擇角色' && role.trim() !== '')
		.map((role) => role.trim());

	return roles;
}

/**
 * 創建指定數量玩家的房間
 */
export async function createRoomWithPlayers(
	browser: { newContext: () => Promise<BrowserContext> },
	playerCount: number,
	roomPassword: string = 'test123'
): Promise<{ contexts: Array<BrowserContext>; pages: Array<Page>; roomCode: string }> {
	const contexts: Array<BrowserContext> = [];
	const pages: Array<Page> = [];

	// 創建所有玩家的上下文和頁面
	for (let i = 0; i < playerCount; i++) {
		const context = await browser.newContext();
		const page = await context.newPage();
		contexts.push(context);
		pages.push(page);
	}

	// 第一個玩家創建房間
	const testUsers = Object.values(TEST_USERS);
	await ensureLoggedIn(pages[0], testUsers[0]);
	await createRoom(pages[0], roomPassword);
	const roomCode = getRoomCodeFromUrl(pages[0].url());

	// 其他玩家加入房間
	for (let i = 1; i < playerCount; i++) {
		await ensureLoggedIn(pages[i], testUsers[i]);
		await joinRoom(pages[i], roomCode, roomPassword);
		await pages[i].waitForTimeout(500);
	}

	return { contexts, pages, roomCode };
}
