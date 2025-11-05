/**
 * 房間測試
 * 測試房間創建、加入、玩家互動等功能
 */

import { test, expect } from '@playwright/test';
import {
	TEST_USERS,
	ensureLoggedIn,
	createRoom,
	getRoomCodeFromUrl,
	waitForRoomReady,
	cleanupTestData
} from './helpers';

test.describe('房間功能', () => {
	test.beforeEach(async ({ page }) => {
		await cleanupTestData(page);
	});

	test.describe('創建房間', () => {
		test('應該能夠成功創建房間', async ({ page }) => {
			await ensureLoggedIn(page, TEST_USERS.user1);

			const roomName = `測試房間_${Date.now()}`;
			await createRoom(page, roomName);

			// 應該在房間頁面
			await expect(page).toHaveURL(/\/room\/.+/);

			// 等待房間載入完成
			await waitForRoomReady(page);

			// 應該顯示房間代碼（而不是房間名稱）
			const roomCode = getRoomCodeFromUrl(page.url());
			expect(roomCode).toBeTruthy();
			expect(roomCode.length).toBeGreaterThan(0);

			// 應該在頁面上看到房間代碼
			await expect(page.locator('[data-testid="room-title"]')).toContainText(roomCode);
		});

		// test('創建者應該是房主', async ({ page }) => {
		// 	await ensureLoggedIn(page, TEST_USERS.user1);

		// 	const roomName = `測試房間_${Date.now()}`;
		// 	await createRoom(page, roomName);

		// 	await waitForRoomReady(page);

		// 	// 應該顯示房主標記
		// 	await expect(page.locator('.host-badge')).toBeVisible();
		// });

		// test('應該顯示創建者在玩家列表中', async ({ page }) => {
		// 	await ensureLoggedIn(page, TEST_USERS.user1);

		// 	const roomName = `測試房間_${Date.now()}`;
		// 	await createRoom(page, roomName);

		// 	await waitForRoomReady(page);

		// 	// 應該在玩家列表中看到自己
		// 	await expect(page.locator('[data-testid="players-section"]')).toContainText(
		// 		TEST_USERS.user1.nickname
		// 	);
		// });
	});

	// test.describe('加入房間', () => {
	//   test('應該能夠通過房間代碼加入房間', async ({ browser }) => {
	//     // 創建兩個頁面（兩個用戶）
	//     const context1 = await browser.newContext();
	//     const context2 = await browser.newContext();
	//     const page1 = await context1.newPage();
	//     const page2 = await context2.newPage();
	//
	//     try {
	//       // 用戶1 創建房間
	//       await ensureLoggedIn(page1, TEST_USERS.user1);
	//       const roomName = `測試房間_${Date.now()}`;
	//       await createRoom(page1, roomName);
	//
	//       const roomCode = getRoomCodeFromUrl(page1.url());
	//
	//       // 用戶2 加入房間
	//       await ensureLoggedIn(page2, TEST_USERS.user2);
	//       await joinRoom(page2, roomCode);
	//
	//       // 兩個用戶都應該在同一個房間
	//       await expect(page1).toHaveURL(new RegExp(`/room/${roomCode}`));
	//       await expect(page2).toHaveURL(new RegExp(`/room/${roomCode}`));
	//
	//       // 兩個用戶都應該看到對方
	//       await expect(page1.locator('body')).toContainText(TEST_USERS.user2.nickname);
	//       await expect(page2.locator('body')).toContainText(TEST_USERS.user1.nickname);
	//     } finally {
	//       await context1.close();
	//       await context2.close();
	//     }
	//   });
	//
	//   test('應該拒絕加入不存在的房間', async ({ page }) => {
	//     await ensureLoggedIn(page, TEST_USERS.user1);
	//
	//     await page.goto('/');
	//     await page.click('button:has-text("加入房間")');
	//     await page.fill('input[name="roomCode"]', 'NONEXISTENT999');
	//     await page.click('button[type="submit"]');
	//
	//     // 應該顯示錯誤訊息
	//     const errorVisible = await page.locator('.error-message, [role="alert"], .alert-error').count() > 0;
	//     expect(errorVisible).toBeTruthy();
	//   });
	//
	//   test('應該拒絕加入已滿的房間', async ({ browser }) => {
	//     // 這個測試假設房間有人數限制
	//     // 如果你的遊戲有最大玩家數限制，可以實現這個測試
	//     // 否則可以跳過
	//     test.skip();
	//   });
	// });

	// test.describe('房間內互動', () => {
	//   test('多個玩家應該能夠看到彼此', async ({ browser }) => {
	//     const context1 = await browser.newContext();
	//     const context2 = await browser.newContext();
	//     const context3 = await browser.newContext();
	//     const page1 = await context1.newPage();
	//     const page2 = await context2.newPage();
	//     const page3 = await context3.newPage();
	//
	//     try {
	//       // 用戶1 創建房間
	//       await ensureLoggedIn(page1, TEST_USERS.user1);
	//       const roomName = `測試房間_${Date.now()}`;
	//       await createRoom(page1, roomName);
	//       const roomCode = getRoomCodeFromUrl(page1.url());
	//
	//       // 用戶2 和用戶3 加入房間
	//       await ensureLoggedIn(page2, TEST_USERS.user2);
	//       await joinRoom(page2, roomCode);
	//
	//       await ensureLoggedIn(page3, TEST_USERS.user3);
	//       await joinRoom(page3, roomCode);
	//
	//       // 等待房間更新
	//       await page1.waitForTimeout(1000);
	//
	//       // 所有玩家都應該看到所有其他玩家
	//       await expect(page1.locator('body')).toContainText(TEST_USERS.user2.nickname);
	//       await expect(page1.locator('body')).toContainText(TEST_USERS.user3.nickname);
	//
	//       await expect(page2.locator('body')).toContainText(TEST_USERS.user1.nickname);
	//       await expect(page2.locator('body')).toContainText(TEST_USERS.user3.nickname);
	//
	//       await expect(page3.locator('body')).toContainText(TEST_USERS.user1.nickname);
	//       await expect(page3.locator('body')).toContainText(TEST_USERS.user2.nickname);
	//     } finally {
	//       await context1.close();
	//       await context2.close();
	//       await context3.close();
	//     }
	//   });
	//
	//   test('玩家離開房間後應該從列表中消失', async ({ browser }) => {
	//     const context1 = await browser.newContext();
	//     const context2 = await browser.newContext();
	//     const page1 = await context1.newPage();
	//     const page2 = await context2.newPage();
	//
	//     try {
	//       // 用戶1 創建房間
	//       await ensureLoggedIn(page1, TEST_USERS.user1);
	//       const roomName = `測試房間_${Date.now()}`;
	//       await createRoom(page1, roomName);
	//       const roomCode = getRoomCodeFromUrl(page1.url());
	//
	//       // 用戶2 加入房間
	//       await ensureLoggedIn(page2, TEST_USERS.user2);
	//       await joinRoom(page2, roomCode);
	//
	//       // 等待玩家列表更新
	//       await page1.waitForTimeout(1000);
	//       await expect(page1.locator('body')).toContainText(TEST_USERS.user2.nickname);
	//
	//       // 用戶2 離開房間
	//       await page2.click('button:has-text("離開"), a[href="/"]');
	//
	//       // 等待更新
	//       await page1.waitForTimeout(1000);
	//
	//       // 用戶1 應該看不到用戶2 了
	//       const stillVisible = await page1.locator('body').textContent();
	//       // 這裡的邏輯可能需要根據實際實現調整
	//     } finally {
	//       await context1.close();
	//       await context2.close();
	//     }
	//   });
	// });

	// test.describe('開始遊戲', () => {
	//   test('只有房主應該能夠開始遊戲', async ({ browser }) => {
	//     const context1 = await browser.newContext();
	//     const context2 = await browser.newContext();
	//     const page1 = await context1.newPage();
	//     const page2 = await context2.newPage();
	//
	//     try {
	//       // 用戶1 創建房間
	//       await ensureLoggedIn(page1, TEST_USERS.user1);
	//       const roomName = `測試房間_${Date.now()}`;
	//       await createRoom(page1, roomName);
	//       const roomCode = getRoomCodeFromUrl(page1.url());
	//
	//       // 用戶2 加入房間
	//       await ensureLoggedIn(page2, TEST_USERS.user2);
	//       await joinRoom(page2, roomCode);
	//
	//       await waitForRoomReady(page1);
	//       await waitForRoomReady(page2);
	//
	//       // 用戶1（房主）應該能看到開始遊戲按鈕
	//       const startButton1 = await page1.locator('button:has-text("開始遊戲")').count();
	//       expect(startButton1).toBeGreaterThan(0);
	//
	//       // 用戶2（非房主）應該看不到開始遊戲按鈕
	//       const startButton2 = await page2.locator('button:has-text("開始遊戲")').count();
	//       expect(startButton2).toBe(0);
	//     } finally {
	//       await context1.close();
	//       await context2.close();
	//     }
	//   });
	//
	//   test('房主開始遊戲後所有玩家都應該進入遊戲', async ({ browser }) => {
	//     const context1 = await browser.newContext();
	//     const context2 = await browser.newContext();
	//     const page1 = await context1.newPage();
	//     const page2 = await context2.newPage();
	//
	//     try {
	//       // 用戶1 創建房間
	//       await ensureLoggedIn(page1, TEST_USERS.user1);
	//       const roomName = `測試房間_${Date.now()}`;
	//       await createRoom(page1, roomName);
	//       const roomCode = getRoomCodeFromUrl(page1.url());
	//
	//       // 用戶2 加入房間
	//       await ensureLoggedIn(page2, TEST_USERS.user2);
	//       await joinRoom(page2, roomCode);
	//
	//       await waitForRoomReady(page1);
	//       await waitForRoomReady(page2);
	//
	//       // 用戶1 開始遊戲
	//       await startGame(page1);
	//
	//       // 兩個玩家都應該看到遊戲界面
	//       await expect(page1.locator('[data-testid="game-board"], .game-board')).toBeVisible({ timeout: 5000 });
	//       await expect(page2.locator('[data-testid="game-board"], .game-board')).toBeVisible({ timeout: 5000 });
	//     } finally {
	//       await context1.close();
	//       await context2.close();
	//     }
	//   });
	//
	//   test('應該要求最少玩家數才能開始遊戲', async ({ page }) => {
	//     await ensureLoggedIn(page, TEST_USERS.user1);
	//
	//     const roomName = `測試房間_${Date.now()}`;
	//     await createRoom(page, roomName);
	//
	//     await waitForRoomReady(page);
	//
	//     // 嘗試開始遊戲
	//     const startButton = page.locator('button:has-text("開始遊戲")');
	//
	//     if (await startButton.count() > 0) {
	//       await startButton.click();
	//
	//       // 如果遊戲需要多個玩家，應該顯示錯誤訊息
	//       // 這個行為取決於你的遊戲規則
	//       const errorVisible = await page.locator('.error-message, [role="alert"]').count() > 0;
	//       const gameStarted = await page.locator('[data-testid="game-board"], .game-board').count() > 0;
	//
	//       // 要麼顯示錯誤，要麼成功開始遊戲
	//       expect(errorVisible || gameStarted).toBeTruthy();
	//     }
	//   });
	// });

	// test.describe('房間資訊', () => {
	//   test('應該顯示房間名稱', async ({ page }) => {
	//     await ensureLoggedIn(page, TEST_USERS.user1);
	//
	//     const roomName = `測試房間_${Date.now()}`;
	//     await createRoom(page, roomName);
	//
	//     await expect(page.locator('body')).toContainText(roomName);
	//   });
	//
	//   test('應該顯示房間代碼', async ({ page }) => {
	//     await ensureLoggedIn(page, TEST_USERS.user1);
	//
	//     const roomName = `測試房間_${Date.now()}`;
	//     await createRoom(page, roomName);
	//
	//     const roomCode = getRoomCodeFromUrl(page.url());
	//
	//     // 房間代碼應該顯示在頁面上
	//     await expect(page.locator('body')).toContainText(roomCode);
	//   });
	//
	//   test('應該顯示當前玩家數量', async ({ page }) => {
	//     await ensureLoggedIn(page, TEST_USERS.user1);
	//
	//     const roomName = `測試房間_${Date.now()}`;
	//     await createRoom(page, roomName);
	//
	//     await waitForRoomReady(page);
	//
	//     // 應該顯示玩家數量（至少1個）
	//     const players = await getPlayersInRoom(page);
	//     expect(players.length).toBeGreaterThan(0);
	//   });
	// });
});
