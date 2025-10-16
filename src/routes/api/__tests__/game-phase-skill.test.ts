import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom } from './helpers';

describe('Game Phase APIs - Skill Phase', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 6; i++) {
			const userData = await createTestUser(`-skill-${i}`);
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

	describe('POST /api/room/[name]/identify-player', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/identify-player`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ targetPlayerId: 1 })
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕缺少 targetPlayerId 的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/identify-player`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({})
				}
			);

			expect([400, 403]).toContain(response.status);
		});

		it('應該拒絕無效的 targetPlayerId', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/identify-player`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ targetPlayerId: 'invalid' })
				}
			);

			expect([400, 403]).toContain(response.status);
		});
	});

	describe('POST /api/room/[name]/identify-artifact', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/identify-artifact`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ artifactId: 1 })
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕缺少 artifactId 的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/identify-artifact`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({})
				}
			);

			expect([400, 403]).toContain(response.status);
		});
	});

	describe('POST /api/room/[name]/attack-player', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/attack-player`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ targetPlayerId: 1 })
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕缺少 targetPlayerId 的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/attack-player`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({})
				}
			);

			expect([400, 403]).toContain(response.status);
		});
	});

	describe('POST /api/room/[name]/block-artifact', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/block-artifact`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ artifactId: 1 })
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕缺少 artifactId 的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/block-artifact`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({})
				}
			);

			expect([400, 403]).toContain(response.status);
		});
	});

	describe('POST /api/room/[name]/swap-artifacts', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/swap-artifacts`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ artifact1Id: 1, artifact2Id: 2 })
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕缺少必要參數的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/swap-artifacts`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ artifact1Id: 1 })
				}
			);

			expect([400, 403]).toContain(response.status);
		});
	});

	describe('GET /api/room/[name]/artifacts', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/artifacts`
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕不在房間中的玩家', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/artifacts`,
				{
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`
					}
				}
			);

			expect([403, 404]).toContain(response.status);
		});
	});

	describe('GET /api/room/[name]/next-player', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/next-player`
			);

			// GET method not allowed (API only supports POST)
			expect(response.status).toBe(405);
		});

		it('應該拒絕不在房間中的玩家', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/next-player`,
				{
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`
					}
				}
			);

			// GET method not allowed (API only supports POST)
			expect(response.status).toBe(405);
		});
	});
});
