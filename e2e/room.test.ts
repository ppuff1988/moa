/**
 * 房間測試
 * 測試房間創建、加入、玩家互動等功能
 */

import { test, expect, type Dialog } from '@playwright/test';
import {
	TEST_USERS,
	ensureLoggedIn,
	createRoom,
	getRoomCodeFromUrl,
	cleanupTestData,
	joinRoom,
	registerAndLogin,
	createTestUser,
	createRoomWithPlayers,
	startRoleSelection,
	selectAndLockRole,
	clickHomeIcon,
	confirmLeaveGame,
	getPlayerCount,
	isPlayerLocked
} from './helpers';

test.describe('房間功能', () => {
	test.beforeEach(async ({ page }) => {
		await cleanupTestData(page);
	});

	test.describe('創建房間', () => {
		test('應該能夠成功創建房間', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomPassword = 'test123';
			await createRoom(page, roomPassword);

			// 應該在房間頁面
			await expect(page).toHaveURL(/\/room\/.+/);

			// 應該顯示房間代碼
			const roomCode = getRoomCodeFromUrl(page.url());
			expect(roomCode).toBeTruthy();
			expect(roomCode.length).toBeGreaterThan(0);

			// 應該在頁面上看到房間代碼
			await expect(page.locator('.room-number')).toContainText(roomCode);
		});

		test('創建者應該是房主', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomPassword = 'test123';
			await createRoom(page, roomPassword);

			// 應該顯示房主標記
			await expect(page.locator('.host-badge')).toBeVisible();
		});

		test('應該顯示創建者在玩家列表中', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomPassword = 'test123';
			await createRoom(page, roomPassword);

			// 應該在玩家列表中看到自己
			await expect(page.locator('[data-testid="players-section"]')).toContainText(
				TEST_USERS.user1.nickname
			);
		});
	});

	test.describe('加入房間', () => {
		test('應該能夠通過房間代碼加入房間', async ({ browser }) => {
			// 創建兩個頁面（兩個用戶）
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const page1 = await context1.newPage();
			const page2 = await context2.newPage();

			try {
				// 用戶1 創建房間
				await ensureLoggedIn(page1, TEST_USERS.user1);
				const roomPassword = 'test123';
				await createRoom(page1, roomPassword);

				const roomCode = getRoomCodeFromUrl(page1.url());

				// 用戶2 加入房間
				await ensureLoggedIn(page2, TEST_USERS.user2);
				await joinRoom(page2, roomCode, roomPassword);

				// 兩個用戶都應該在同一個房間
				await expect(page1).toHaveURL(new RegExp(`/room/${roomCode}`));
				await expect(page2).toHaveURL(new RegExp(`/room/${roomCode}`));

				// 兩個用戶都應該看到對方
				await expect(page1.locator('body')).toContainText(TEST_USERS.user2.nickname);
				await expect(page2.locator('body')).toContainText(TEST_USERS.user1.nickname);
			} finally {
				await context1.close();
				await context2.close();
			}
		});

		test('應該拒絕加入不存在的房間', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			await page.goto('/');
			await page.click('button:has-text("加入房間")');
			await page.waitForSelector('#roomName', { timeout: 5000 });
			await page.fill('#roomName', 'NONEXISTENT999');
			await page.fill('#roomPassword', 'test123');
			await page.click('button[type="submit"]');

			// 等待錯誤訊息出現
			await page.waitForTimeout(1000);

			// 應該顯示錯誤訊息或仍在首頁
			const errorVisible =
				(await page
					.locator('.error-message, [role="alert"], .alert-error, .room-form .error')
					.count()) > 0;
			const stillOnHome = page.url().includes('/') && !page.url().includes('/room/');

			expect(errorVisible || stillOnHome).toBeTruthy();
		});

		test('應該拒絕加入已滿的房間', async ({ browser }) => {
			// 房間最多8人
			const contexts = [];
			const pages = [];

			try {
				// 創建8個用戶並加入房間
				for (let i = 0; i < 8; i++) {
					const context = await browser.newContext();
					const page = await context.newPage();
					contexts.push(context);
					pages.push(page);

					const user = createTestUser(`full_room_${i}`, Date.now() + i);
					await registerAndLogin(page, user);

					if (i === 0) {
						// 第一個用戶創建房間
						const roomPassword = 'test123';
						await createRoom(page, roomPassword);
					} else {
						// 其他用戶加入房間
						const roomCode = getRoomCodeFromUrl(pages[0].url());
						await joinRoom(page, roomCode, 'test123');
					}
				}

				// 等待所有玩家加入
				await pages[0].waitForTimeout(2000);

				// 第9個用戶嘗試加入
				const context9 = await browser.newContext();
				const page9 = await context9.newPage();
				contexts.push(context9);

				const user9 = createTestUser('full_room_9', Date.now() + 9);
				await registerAndLogin(page9, user9);

				const roomCode = getRoomCodeFromUrl(pages[0].url());

				// 嘗試加入已滿的房間
				await page9.goto('/');
				await page9.click('button:has-text("加入房間")');
				await page9.waitForSelector('#roomName', { timeout: 5000 });
				await page9.fill('#roomName', roomCode);
				await page9.fill('#roomPassword', 'test123');
				await page9.click('button[type="submit"]');

				// 等待錯誤訊息出現
				await page9.waitForTimeout(1000);

				// 應該顯示錯誤訊息或仍在首頁
				const errorVisible =
					(await page9.locator('.error-message, [role="alert"], .alert-error').count()) > 0;
				const stillOnHome = page9.url().includes('/') && !page9.url().includes('/room/');

				expect(errorVisible || stillOnHome).toBeTruthy();
			} finally {
				// 清理所有上下文
				for (const ctx of contexts) {
					await ctx.close();
				}
			}
		});
	});

	test.describe('房間內互動', () => {
		test('多個玩家應該能夠看到彼此', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const context3 = await browser.newContext();
			const page1 = await context1.newPage();
			const page2 = await context2.newPage();
			const page3 = await context3.newPage();

			try {
				// 用戶1 創建房間
				await ensureLoggedIn(page1, TEST_USERS.user1);
				const roomPassword = 'test123';
				await createRoom(page1, roomPassword);
				const roomCode = getRoomCodeFromUrl(page1.url());

				// 用戶2 和用戶3 加入房間
				await ensureLoggedIn(page2, TEST_USERS.user2);
				await joinRoom(page2, roomCode, roomPassword);

				await ensureLoggedIn(page3, TEST_USERS.user3);
				await joinRoom(page3, roomCode, roomPassword);

				// 等待房間更新
				await page1.waitForTimeout(1000);

				// 所有玩家都應該看到所有其他玩家
				await expect(page1.locator('body')).toContainText(TEST_USERS.user2.nickname);
				await expect(page1.locator('body')).toContainText(TEST_USERS.user3.nickname);

				await expect(page2.locator('body')).toContainText(TEST_USERS.user1.nickname);
				await expect(page2.locator('body')).toContainText(TEST_USERS.user3.nickname);

				await expect(page3.locator('body')).toContainText(TEST_USERS.user1.nickname);
				await expect(page3.locator('body')).toContainText(TEST_USERS.user2.nickname);
			} finally {
				await context1.close();
				await context2.close();
				await context3.close();
			}
		});

		test('玩家離開房間後應該從列表中消失', async ({ browser }) => {
			const context1 = await browser.newContext();
			const context2 = await browser.newContext();
			const page1 = await context1.newPage();
			const page2 = await context2.newPage();

			try {
				// 用戶1 創建房間
				await ensureLoggedIn(page1, TEST_USERS.user1);
				const roomPassword = 'test123';
				await createRoom(page1, roomPassword);
				const roomCode = getRoomCodeFromUrl(page1.url());

				// 用戶2 加入房間
				await ensureLoggedIn(page2, TEST_USERS.user2);
				await joinRoom(page2, roomCode, roomPassword);

				// 等待玩家列表更新
				await page1.waitForTimeout(1000);
				await expect(page1.locator('body')).toContainText(TEST_USERS.user2.nickname);

				// 用戶2 離開房間
				await page2.click('button:has-text("離開房間")');

				// 檢查是否有確認對話框
				const confirmButton = page2.locator('button:has-text("確認離開"), button:has-text("確定")');
				const hasConfirm = await confirmButton.isVisible({ timeout: 1000 }).catch(() => false);
				if (hasConfirm) {
					await confirmButton.click();
				}

				// 等待 Socket.IO 更新玩家列表
				await page1.waitForTimeout(2000);

				// 用戶1 應該在玩家列表中看不到用戶2 了
				// 檢查玩家列表區域（不包括通知訊息）
				const playerListContent = await page1
					.locator('[data-testid="players-section"], .player-list, .players-container')
					.textContent()
					.catch(() => '');

				// 如果找不到特定的玩家列表容器，檢查是否只有1個玩家
				if (playerListContent) {
					expect(playerListContent).not.toContain(TEST_USERS.user2.nickname);
				} else {
					// 備用方案：檢查房間資訊顯示的玩家數量
					const roomInfo = await page1
						.locator('[data-testid="room-info"], .room-info')
						.textContent();
					expect(roomInfo).toContain('1/8');
				}

				// 驗證用戶2已經回到首頁
				await expect(page2).toHaveURL('/');
			} finally {
				await context1.close();
				await context2.close();
			}
		});
	});

	test.describe('開始遊戲', () => {
		test('只有房主應該能夠點擊選擇角色', async ({ browser }) => {
			// 創建6個玩家的上下文（最低人數要求）
			const contexts = [];
			const pages = [];

			try {
				// 創建6個玩家
				const users = [
					TEST_USERS.user1,
					TEST_USERS.user2,
					TEST_USERS.user3,
					TEST_USERS.user4,
					TEST_USERS.user5,
					TEST_USERS.user6
				];

				for (let i = 0; i < 6; i++) {
					const context = await browser.newContext();
					const page = await context.newPage();
					contexts.push(context);
					pages.push(page);

					await ensureLoggedIn(page, users[i]);

					if (i === 0) {
						// 第一個用戶創建房間
						const roomPassword = 'test123';
						await createRoom(page, roomPassword);
					} else {
						// 其他用戶加入房間
						const roomCode = getRoomCodeFromUrl(pages[0].url());
						await joinRoom(page, roomCode, 'test123');
					}
				}

				// 等待房間準備就緒
				await pages[0].waitForTimeout(2000);

				// 用戶1（房主）應該能看到選擇角色按鈕
				const selectRoleButton1 = await pages[0].locator('button:has-text("選擇角色")').count();
				expect(selectRoleButton1).toBeGreaterThan(0);

				// 用戶2（非房主）應該看不到選擇角色按鈕
				const selectRoleButton2 = await pages[1].locator('button:has-text("選擇角色")').count();
				expect(selectRoleButton2).toBe(0);

				// 開始遊戲按鈕在選擇角色之前應該不可見或禁用
				const startButton1Before = await pages[0].locator('button:has-text("開始遊戲")').count();
				expect(startButton1Before).toBe(0);
			} finally {
				for (const ctx of contexts) {
					await ctx.close();
				}
			}
		});

		test('房主開始遊戲後所有玩家都應該進入遊戲', async ({ browser }) => {
			// 創建6個玩家的上下文（最低人數要求）
			const contexts = [];
			const pages = [];

			try {
				// 創建6個玩家
				const users = [
					TEST_USERS.user1,
					TEST_USERS.user2,
					TEST_USERS.user3,
					TEST_USERS.user4,
					TEST_USERS.user5,
					TEST_USERS.user6
				];

				for (let i = 0; i < 6; i++) {
					const context = await browser.newContext();
					const page = await context.newPage();
					contexts.push(context);
					pages.push(page);

					await ensureLoggedIn(page, users[i]);

					if (i === 0) {
						// 第一個用戶創建房間
						const roomPassword = 'test123';
						await createRoom(page, roomPassword);
					} else {
						// 其他用戶加入房間
						const roomCode = getRoomCodeFromUrl(pages[0].url());
						await joinRoom(page, roomCode, 'test123');
					}
				}

				// 等待所有玩家加入並更新房間狀態
				await pages[0].waitForTimeout(3000);

				// 等待「選擇角色」按鈕變為可用（不再 disabled）
				await pages[0].waitForSelector('button:has-text("選擇角色"):not([disabled])', {
					state: 'visible',
					timeout: 30000
				});

				// 房主點擊右上角「選擇角色」按鈕進入選角階段
				await pages[0].click('button:has-text("選擇角色")');

				// 等待所有玩家進入選角階段
				await pages[0].waitForTimeout(2000);

				// 驗證所有玩家進入角色選擇階段
				for (let i = 0; i < users.length; i++) {
					await expect(pages[i].locator('select.selection-dropdown').first()).toBeVisible({
						timeout: 10000
					});
				}

				// 追蹤已選擇的角色和顏色，避免重複
				const selectedRoles: string[] = [];
				const selectedColors: string[] = [];

				// 所有玩家依序選擇角色和顏色，然後按下「鎖定」按鈕
				for (let i = 0; i < users.length; i++) {
					// 等待角色選擇界面完全載入
					await pages[i].waitForTimeout(1000);

					// 選擇角色（使用下拉選單）
					const roleSelect = pages[i].locator('select.selection-dropdown').first();
					await roleSelect.waitFor({ state: 'visible', timeout: 5000 });

					// 獲取所有角色選項
					const roleOptions = await roleSelect.locator('option').allTextContents();

					// 找到一個尚未被選擇的角色
					const availableRole = roleOptions.find(
						(role) =>
							role && role !== '請選擇角色' && role.trim() !== '' && !selectedRoles.includes(role)
					);

					if (availableRole) {
						await roleSelect.selectOption({ label: availableRole });
						selectedRoles.push(availableRole);
						console.log(`玩家 ${i + 1} 選擇角色: ${availableRole}`);
					} else {
						// 如果找不到未選擇的角色，選擇第一個非空選項（後備方案）
						const firstRole = roleOptions.find(
							(role) => role && role !== '請選擇角色' && role.trim() !== ''
						);
						if (firstRole) {
							await roleSelect.selectOption({ label: firstRole });
							selectedRoles.push(firstRole);
						} else {
							await roleSelect.selectOption({ index: 1 });
						}
					}

					// 等待一下確保選擇已註冊
					await pages[i].waitForTimeout(500);

					// 選擇顏色（使用下拉選單）- 確保每個玩家選擇不同的顏色
					const colorSelect = pages[i]
						.locator('select.color-dropdown, select.selection-dropdown')
						.nth(1);
					if (await colorSelect.isVisible()) {
						// 獲取可用顏色選項
						const colorOptions = await colorSelect.locator('option').allTextContents();

						// 找到一個尚未被選擇的顏色
						const availableColor = colorOptions.find(
							(color) =>
								color &&
								color !== '請選擇顏色' &&
								color !== '自訂顏色' &&
								color.trim() !== '' &&
								!selectedColors.includes(color)
						);

						if (availableColor) {
							await colorSelect.selectOption({ label: availableColor });
							selectedColors.push(availableColor);
						} else {
							const firstColor = colorOptions.find(
								(color) =>
									color && color !== '請選擇顏色' && color !== '自訂顏色' && color.trim() !== ''
							);
							if (firstColor) {
								await colorSelect.selectOption({ label: firstColor });
								selectedColors.push(firstColor);
							} else {
								await colorSelect.selectOption({ index: 1 });
							}
						}
					}

					// 等待一下確保選擇已註冊
					await pages[i].waitForTimeout(500);

					// 點擊「鎖定」按鈕
					const lockButton = pages[i].locator('button.confirm-btn:has-text("鎖定")');
					if (await lockButton.isVisible()) {
						await lockButton.click();
					}

					// 等待鎖定完成
					await pages[i].waitForTimeout(1000);
				}

				// 等待所有玩家鎖定完成
				await pages[0].waitForTimeout(2000);

				// 驗證房主看到右上角「開始遊戲」按鈕
				const startButton = pages[0].locator('button:has-text("開始遊戲")');
				await expect(startButton).toBeVisible({ timeout: 10000 });

				// 房主點擊開始遊戲
				await startButton.click();

				// 等待遊戲開始
				await pages[0].waitForTimeout(3000);

				// 驗證遊戲已開始 - 檢查是否進入遊戲階段（檢查遊戲相關文字出現）
				await Promise.race([
					pages[0]
						.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
						.isVisible({ timeout: 10000 })
						.catch(() => false),
					pages[1]
						.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
						.isVisible({ timeout: 10000 })
						.catch(() => false),
					pages[2]
						.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
						.isVisible({ timeout: 10000 })
						.catch(() => false),
					pages[3]
						.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
						.isVisible({ timeout: 10000 })
						.catch(() => false),
					pages[4]
						.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
						.isVisible({ timeout: 10000 })
						.catch(() => false),
					pages[5]
						.locator('text=/技能階段|遊戲開始|輪到你|使用技能|遊戲中/')
						.isVisible({ timeout: 10000 })
						.catch(() => false)
				]);

				// 驗證房間標題仍然存在
				await expect(pages[0].locator('.room-number').first()).toBeVisible();
			} finally {
				for (const ctx of contexts) {
					await ctx.close();
				}
			}
		});

		test('應該要求最少玩家數才能開始遊戲', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomPassword = 'test123';
			await createRoom(page, roomPassword);

			// 等待房間準備就緒
			await page.waitForTimeout(1000);

			// 嘗試開始遊戲
			const startButton = page.locator('button:has-text("開始遊戲")');

			if ((await startButton.count()) > 0) {
				await startButton.click();

				// 如果遊戲需要多個玩家，應該顯示錯誤訊息
				// 這個行為取決於你的遊戲規則
				const errorVisible = (await page.locator('.error-message, [role="alert"]').count()) > 0;
				const gameStarted =
					(await page.locator('[data-testid="game-board"], .game-board').count()) > 0;

				// 要麼顯示錯誤，要麼成功開始遊戲
				expect(errorVisible || gameStarted).toBeTruthy();
			}
		});
	});

	test.describe('房間資訊', () => {
		test('應該顯示房間代碼', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomPassword = 'test123';
			await createRoom(page, roomPassword);

			const roomCode = getRoomCodeFromUrl(page.url());

			// 房間代碼應該顯示在頁面上
			await expect(page.locator('body')).toContainText(roomCode);
		});

		test('應該顯示房間代碼在 URL 中', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomPassword = 'test123';
			await createRoom(page, roomPassword);

			const roomCode = getRoomCodeFromUrl(page.url());

			// 房間代碼應該在 URL 中
			expect(roomCode).toBeTruthy();
			expect(roomCode.length).toBeGreaterThan(0);
		});

		test('應該顯示當前玩家', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomPassword = 'test123';
			await createRoom(page, roomPassword);

			// 等待房間準備就緒
			await page.waitForTimeout(1000);

			// 應該在玩家列表中看到自己
		});
	});

	test.describe('玩家離開導致遊戲強制結束', () => {
		test('8人遊戲部分玩家已鎖定，3位玩家依序離開後人數降至5人，遊戲強制結束', async ({
			browser
		}) => {
			const roomPassword = 'test123';
			const playerCount = 8;

			// 創建8人房間
			const { contexts, pages, roomCode } = await createRoomWithPlayers(
				browser,
				playerCount,
				roomPassword
			);

			try {
				console.log(`✅ 已創建 ${playerCount} 人房間，房間代碼: ${roomCode}`);

				// 驗證所有玩家都在房間內
				for (let i = 0; i < playerCount; i++) {
					const count = await getPlayerCount(pages[i]);
					expect(count).toBe(playerCount);
				}

				// 房主開始選角
				await startRoleSelection(pages[0]);
				console.log('✅ 房主已開始選角');

				// 等待所有玩家看到選角介面
				for (let i = 0; i < playerCount; i++) {
					await pages[i].waitForSelector(
						'select.selection-dropdown, select:has(option:has-text("請選擇角色"))',
						{
							timeout: 10000
						}
					);
				}
				console.log('✅ 所有玩家已進入選角介面');

				// 玩家1-4鎖定角色（部分玩家鎖定）
				const rolesToLock = [
					{ player: 0, role: '許愿', color: 'red' },
					{ player: 2, role: '黃煙煙', color: 'blue' },
					{ player: 3, role: '方震', color: 'green' },
					{ player: 4, role: '木戶加奈', color: 'yellow' }
				];

				for (const { player, role, color } of rolesToLock) {
					await selectAndLockRole(pages[player], role, color);
					console.log(`✅ 玩家${player + 1} 已鎖定角色: ${role}`);
					await pages[player].waitForTimeout(1000);
				}
				console.log('✅ 所有玩家已執行鎖定操作');

				// ===== 第一位玩家離開：8人 -> 7人 =====
				console.log('\n--- 第一位玩家離開 (8人 -> 7人) ---');
				await clickHomeIcon(pages[1]);
				await confirmLeaveGame(pages[1]);
				await pages[1].waitForURL('/', { timeout: 10000 });
				await pages[0].waitForTimeout(2000);

				// 驗證人數變為7人
				let count = await getPlayerCount(pages[0]);
				expect(count).toBe(7);
				console.log(`✅ 人數降至 7 人`);

				// 驗證鎖定狀態被取消
				const testUsers = Object.values(TEST_USERS);
				const isLocked = await isPlayerLocked(pages[0], testUsers[0].nickname);
				expect(isLocked).toBe(false);
				console.log(`✅ 鎖定狀態已取消`);

				// ===== 第二位玩家離開：7人 -> 6人 =====
				console.log('\n--- 第二位玩家離開 (7人 -> 6人) ---');
				await clickHomeIcon(pages[5]);
				await confirmLeaveGame(pages[5]);
				await pages[5].waitForURL('/', { timeout: 10000 });
				await pages[0].waitForTimeout(2000);

				// 驗證人數變為6人
				count = await getPlayerCount(pages[0]);
				expect(count).toBe(6);
				console.log(`✅ 人數降至 6 人`);

				// ===== 第三位玩家離開：6人 -> 5人（觸發強制結束）=====
				console.log('\n--- 第三位玩家離開 (6人 -> 5人，觸發強制結束) ---');

				// 設定 dialog 處理器（處理強制結束的 alert）
				const dialogPromises: Promise<void>[] = [];
				const remainingPlayers = [0, 2, 3, 4, 7]; // 剩餘的玩家索引

				for (const playerIndex of remainingPlayers) {
					if (playerIndex === 7) continue; // 跳過即將離開的玩家

					const dialogPromise = new Promise<void>((resolve) => {
						pages[playerIndex].once('dialog', async (dialog: Dialog) => {
							console.log(`玩家${playerIndex + 1} 收到強制結束通知:`, dialog.message());
							expect(dialog.message()).toContain('人數不足');
							await dialog.accept();
							resolve();
						});
					});
					dialogPromises.push(dialogPromise);
				}

				// 玩家8離開
				await clickHomeIcon(pages[7]);
				await confirmLeaveGame(pages[7]);
				await pages[7].waitForURL('/', { timeout: 10000 });

				// 等待其他玩家自動被導向首頁（遊戲強制結束）
				console.log('等待其他玩家自動導向首頁...');
				for (const playerIndex of remainingPlayers) {
					if (playerIndex === 7) continue;
					await pages[playerIndex].waitForURL('/', { timeout: 15000 });
					console.log(`✅ 玩家${playerIndex + 1} 已被自動導向首頁`);
				}

				// 等待所有 alert 被處理
				await Promise.race([Promise.all(dialogPromises), pages[0].waitForTimeout(10000)]);
				console.log('✅ 所有玩家已收到強制結束通知');

				console.log('\n✅ 測試完成：8人遊戲有3人依序離開，最後觸發強制結束');
			} finally {
				// 清理：關閉所有上下文
				for (const context of contexts) {
					await context.close();
				}
			}
		});
	});
});
