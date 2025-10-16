import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser } from './helpers';

describe('Room Creation Validation API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 3; i++) {
			const userData = await createTestUser(`-create-val-${i}`);
			testUsers.push({
				email: userData.email,
				token: userData.token,
				userId: userData.userId
			});
		}
	});

	afterAll(async () => {
		// 清理測試數據
		for (const gameId of testGames) {
			try {
				await db.delete(gamePlayers).where(eq(gamePlayers.gameId, gameId));
				await db.delete(games).where(eq(games.id, gameId));
			} catch (error) {
				console.error('清理遊戲數據失敗:', error);
			}
		}

		for (const testUser of testUsers) {
			try {
				await db.delete(user).where(eq(user.email, testUser.email));
			} catch (error) {
				console.error('清理用戶數據失敗:', error);
			}
		}
	});

	describe('POST /api/room/create - Input Validation', () => {
		it('應該成功創建房間並自動生成房間名稱', async () => {
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: 'test123'
				})
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.roomName).toMatch(/^\d{6}$/); // 6碼數字
			testGames.push(data.gameId);
		});

		it('應該拒絕空字串的密碼', async () => {
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: ''
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toMatch(/密碼|必填|不能為空/);
		});

		it('應該拒絕過短的密碼', async () => {
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: '12'
				})
			});

			expect([400]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/密碼|長度|最少/);
		});

		it('應該拒絕缺少密碼的請求', async () => {
			// 完全空的請求體
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toMatch(/密碼/);
		});

		it('應該驗證生成的房間名稱唯一性', async () => {
			const responses = [];
			// 創建多個房間，驗證名稱不重複
			for (let i = 0; i < 3; i++) {
				const response = await fetch(`${API_BASE}/api/room/create`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						password: 'test123'
					})
				});

				if (response.status === 201) {
					const data = await response.json();
					responses.push(data.roomName);
					testGames.push(data.gameId);
				}
			}

			// 檢查所有房間名稱都不相同
			const uniqueNames = new Set(responses);
			expect(uniqueNames.size).toBe(responses.length);

			// 所有房間名稱都是6碼數字
			responses.forEach((name) => {
				expect(name).toMatch(/^\d{6}$/);
			});
		});

		it('應該拒絕無效的 JSON 格式', async () => {
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: 'invalid json'
			});

			expect(response.status).toBe(400);
		});
	});
});
