import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom } from './helpers';

describe('Game Phase APIs - Identification Phase', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 6; i++) {
			const userData = await createTestUser(`-identification-${i}`);
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

	describe('POST /api/room/[name]/submit-identification', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/submit-identification`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ targetPlayerId: 1, isGood: true })
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕缺少必要參數的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 缺少 targetPlayerId
			const response1 = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/submit-identification`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ isGood: true })
				}
			);

			expect([400, 403]).toContain(response1.status);

			// 缺少 isGood
			const response2 = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/submit-identification`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ targetPlayerId: 1 })
				}
			);

			expect([400, 403]).toContain(response2.status);
		});

		it('應該拒絕無效的 isGood 值', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/submit-identification`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ targetPlayerId: 1, isGood: 'yes' })
				}
			);

			expect([400, 403]).toContain(response.status);
		});
	});

	describe('POST /api/room/[name]/publish-identification', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/publish-identification`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕不在房間中的玩家', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/publish-identification`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect([403, 404]).toContain(response.status);
		});
	});

	describe('GET /api/room/[name]/identification-status', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/identification-status`
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕不在房間中的玩家', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/identification-status`,
				{
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`
					}
				}
			);

			expect([403, 404]).toContain(response.status);
		});
	});
});
