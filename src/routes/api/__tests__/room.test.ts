import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser } from './helpers';

describe('Room Management API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 3; i++) {
			const userData = await createTestUser(`-room-${i}`);
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

	describe('POST /api/room/create', () => {
		it('應該成功創建房間並自動生成6碼房間名稱', async () => {
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: 'room123'
				})
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data).toHaveProperty('gameId');
			expect(data).toHaveProperty('roomName');
			expect(data.roomName).toMatch(/^\d{6}$/); // 驗證是6碼數字
			expect(data.message).toBe('創建房間成功');
			expect(data.player).toBeDefined();

			testGames.push(data.gameId);
		});

		it('應該每次生成不同的房間名稱', async () => {
			// 第一次創建
			const firstResponse = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: 'room123'
				})
			});

			const firstData = await firstResponse.json();
			if (firstData.gameId) {
				testGames.push(firstData.gameId);
			}

			// 第二次創建
			const secondResponse = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[1].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: 'room123'
				})
			});

			const secondData = await secondResponse.json();
			if (secondData.gameId) {
				testGames.push(secondData.gameId);
			}

			expect(firstResponse.status).toBe(201);
			expect(secondResponse.status).toBe(201);
			expect(firstData.roomName).not.toBe(secondData.roomName);
			expect(firstData.roomName).toMatch(/^\d{6}$/);
			expect(secondData.roomName).toMatch(/^\d{6}$/);
		});

		it('應該拒絕未認證的請求', async () => {
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					password: 'room123'
				})
			});

			expect(response.status).toBe(401);
		});

		it('應該拒絕缺少密碼', async () => {
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
			expect(data.message).toContain('密碼');
		});
	});

	describe('GET /api/room/[name]/players', () => {
		let testRoomName: string;
		let testGameId: string;

		beforeAll(async () => {
			// 創建測試房間
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: 'room123'
				})
			});

			const data = await response.json();
			testRoomName = data.roomName;
			testGameId = data.gameId;
			testGames.push(testGameId);
		});

		it('應該成功獲取玩家列表', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/players`,
				{
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`
					}
				}
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('players');
			expect(Array.isArray(data.players)).toBe(true);
			expect(data.players.length).toBeGreaterThan(0);
		});

		it('應該拒絕未認證的請求', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/players`
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕不存在的房間', async () => {
			const response = await fetch(`${API_BASE}/api/room/NonExistentRoom/players`, {
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`
				}
			});

			expect(response.status).toBe(404);
		});
	});

	describe('POST /api/room/[name]/ready', () => {
		let testRoomName: string;
		let testGameId: string;

		beforeAll(async () => {
			// 創建測試房間
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: 'room123'
				})
			});

			const data = await response.json();
			testRoomName = data.roomName;
			testGameId = data.gameId;
			testGames.push(testGameId);
		});

		it('應該在遊戲未開始時拒絕檢查準備狀態', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/ready`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			// 遊戲還在 waiting 狀態，應該返回錯誤
			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toBeDefined();
		});

		it('應該拒絕未認證的請求', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/ready`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ isReady: true })
				}
			);

			expect(response.status).toBe(401);
		});
	});

	describe('POST /api/room/[name]/leave', () => {
		it('應該成功離開房間', async () => {
			// 第一個用戶創建房間
			const createResponse = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: 'room123'
				})
			});

			const createData = await createResponse.json();
			const roomName = createData.roomName;
			testGames.push(createData.gameId);

			// 離開房間
			const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(roomName)}/leave`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				}
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.message).toContain('離開');
		});

		it('應該拒絕未認證的請求', async () => {
			const response = await fetch(`${API_BASE}/api/room/SomeRoom/leave`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			expect(response.status).toBe(401);
		});
	});
});
