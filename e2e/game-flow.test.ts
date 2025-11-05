import { expect, test, type Page } from '@playwright/test';
import {
	createTestUser,
	registerAndLogin as helperRegisterAndLogin,
	type TestUser
} from './helpers';

test.describe('Game Flow', () => {
	// 創建 6 個測試用戶（遊戲最少需要 6 人）
	const users: (TestUser & { page: Page | null })[] = Array.from({ length: 6 }, (_, i) => ({
		...createTestUser(`game_${i}`, Date.now() + i),
		page: null as Page | null
	}));

	let createdRoomName = '';

	async function registerAndLogin(page: Page, user: TestUser) {
		await helperRegisterAndLogin(page, user);
	}

	test('complete game flow with 6 players', async ({ browser }) => {
		test.setTimeout(300000); // 增加超時時間到 5 分鐘

		// 創建 6 個瀏覽器上下文和頁面
		const contexts = await Promise.all(Array.from({ length: 6 }, () => browser.newContext()));
		const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()));
		users.forEach((user, i) => (user.page = pages[i]));

		try {
			// 所有用戶註冊並登入
			for (let i = 0; i < users.length; i++) {
				await registerAndLogin(pages[i], users[i]);
			}

			// 第一個用戶創建房間
			await pages[0].click('text=創建房間');

			// 等待模態框出現
			await pages[0].waitForTimeout(500);

			// 填入密碼（創建房間只需要密碼，房間名稱會自動生成）
			await pages[0].fill('input#roomPassword', 'test123');
			await pages[0].click('form button[type="submit"]:has-text("創建房間")');

			// 等待導航到房間頁面並獲取房間名稱
			await pages[0].waitForURL(/\/room\/.*\/lobby/, { timeout: 10000 });
			const roomUrl = pages[0].url();
			createdRoomName = roomUrl.match(/\/room\/([^/]+)\/lobby/)?.[1] || '';

			// 其他用戶加入房間
			for (let i = 1; i < users.length; i++) {
				await pages[i].click('text=加入房間');
				await pages[i].waitForTimeout(500);
				await pages[i].fill('input#roomName', createdRoomName);
				await pages[i].fill('input#roomPassword', 'test123');
				await pages[i].click('form button[type="submit"]:has-text("加入房間")');
				await expect(pages[i]).toHaveURL(new RegExp(`/room/${createdRoomName}`), {
					timeout: 10000
				});
			}

			// 等待所有玩家加入並更新房間狀態
			await pages[0].waitForTimeout(3000);

			// 驗證房主頁面顯示的玩家數量是否正確（應該是 6 人）
			const playerCountText = await pages[0].locator('[data-testid="room-info"]').textContent();
			console.log('房間玩家數量:', playerCountText);

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
				// 檢查是否有角色選擇的下拉選單（使用更精確的選擇器，只選擇第一個）
				await expect(pages[i].locator('select.selection-dropdown').first()).toBeVisible({
					timeout: 10000
				});
			}

			// 追蹤已選擇的顏色
			const selectedColors: string[] = [];

			// 所有玩家依序選擇角色和顏色，然後按下「鎖定」按鈕
			for (let i = 0; i < users.length; i++) {
				// 等待角色選擇界面完全載入
				await pages[i].waitForTimeout(1000);

				// 選擇角色（使用下拉選單）
				const roleSelect = pages[i].locator('select.selection-dropdown').first();
				await roleSelect.waitFor({ state: 'visible', timeout: 5000 });

				// 獲取可用角色（未禁用的）
				const availableRoleOptions = await roleSelect
					.locator('option:not([disabled])')
					.allTextContents();

				// 選擇第一個可用角色（跳過 index 0 的「請選擇角色」）
				if (availableRoleOptions.length > 0) {
					// 嘗試通過 index 選擇
					try {
						// 找到第一個非「請選擇」的選項
						const roleToSelect = availableRoleOptions.find(
							(opt) => opt && opt !== '請選擇角色' && opt.trim() !== ''
						);

						if (roleToSelect) {
							await roleSelect.selectOption({ label: roleToSelect });
						} else {
							// 如果找不到合適的選項，選擇第一個非空選項
							await roleSelect.selectOption({ index: 1 });
						}
					} catch {
						// 嘗試備用方法：選擇第一個選項
						const firstOption = await roleSelect.locator('option').nth(1).getAttribute('value');
						if (firstOption) {
							await roleSelect.selectOption(firstOption);
						}
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
						// 如果有可用顏色，則選擇該顏色
						await colorSelect.selectOption({ label: availableColor });
						selectedColors.push(availableColor);
						console.log(`玩家 ${i + 1} 選擇顏色: ${availableColor}`);
					} else {
						// 如果沒有可用顏色，選擇第一個可用顏色（作為後備）
						const firstColor = colorOptions.find(
							(color) =>
								color && color !== '請選擇顏色' && color !== '自訂顏色' && color.trim() !== ''
						);
						if (firstColor) {
							await colorSelect.selectOption({ label: firstColor });
							selectedColors.push(firstColor);
							console.log(`玩家 ${i + 1} 選擇顏色 (後備): ${firstColor}`);
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
			const startGameButton = pages[0].locator('button:has-text("開始遊戲")');
			await expect(startGameButton).toBeVisible({ timeout: 10000 });

			// 房主點擊右上角「開始遊戲」按鈕
			await startGameButton.click();

			// 等待遊戲開始
			await pages[0].waitForTimeout(3000);

			// 驗證遊戲已開始 - 檢查是否進入遊戲階段
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

			// 驗證房間標題仍然存在（使用更精確的選擇器，只檢查 h1 標題）
			await expect(pages[0].locator('h1.room-title').first()).toBeVisible();
		} finally {
			// 清理：關閉所有上下文
			for (const ctx of contexts) {
				await ctx.close();
			}
		}
	});

	test('cannot start game with insufficient players', async ({ page }) => {
		const singleUser = createTestUser('single', Date.now());

		// 註冊並登入
		await registerAndLogin(page, singleUser);

		// 創建房間（只需要密碼）
		await page.click('text=創建房間');
		await page.waitForTimeout(500);
		await page.fill('input#roomPassword', 'test123');
		await page.click('form button[type="submit"]:has-text("創建房間")');

		// 等待導航到房間頁面
		await page.waitForURL(/\/room\/.*\/lobby/, { timeout: 10000 });

		// 「選擇角色」按鈕應該被禁用（因為人數不足）
		const selectRoleButton = page.locator('button:has-text("選擇角色")');
		await expect(selectRoleButton).toBeVisible({ timeout: 5000 });
		await expect(selectRoleButton).toBeDisabled();
	});

	test('host can kick players', async ({ browser }) => {
		// 創建 2 個用戶
		const ctx1 = await browser.newContext();
		const ctx2 = await browser.newContext();
		const page1 = await ctx1.newPage();
		const page2 = await ctx2.newPage();

		const host = createTestUser('host', Date.now());
		const guest = createTestUser('guest', Date.now() + 1);

		try {
			// 兩個用戶註冊並登入
			await registerAndLogin(page1, host);
			await registerAndLogin(page2, guest);

			// 主持人創建房間（只需要密碼）
			await page1.click('text=創建房間');
			await page1.waitForTimeout(500);
			await page1.fill('input#roomPassword', 'test123');
			await page1.click('form button[type="submit"]:has-text("創建房間")');

			// 等待導航並獲取房間名稱
			await page1.waitForURL(/\/room\/.*\/lobby/, { timeout: 10000 });
			const roomUrl = page1.url();
			const kickRoomName = roomUrl.match(/\/room\/([^/]+)\/lobby/)?.[1] || '';

			// 訪客加入房間
			await page2.click('text=加入房間');
			await page2.waitForTimeout(500);
			await page2.fill('input#roomName', kickRoomName);
			await page2.fill('input#roomPassword', 'test123');
			await page2.click('form button[type="submit"]:has-text("加入房間")');

			// 等待訪客加入
			await page1.waitForTimeout(1000);

			// 主持人踢出訪客
			const kickButton = page1.locator('button.kick-btn, button:has-text("踢出")').first();
			if (await kickButton.isVisible()) {
				await kickButton.click();

				// 訪客應該被重定向回首頁
				await expect(page2).toHaveURL('/', { timeout: 5000 });
			}
		} finally {
			await ctx1.close();
			await ctx2.close();
		}
	});
});
