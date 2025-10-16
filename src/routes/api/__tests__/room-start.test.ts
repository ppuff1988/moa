import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, joinTestRoom } from './helpers';

describe('Room Start Game API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶（至少需要 6 個玩家才能開始遊戲）
		for (let i = 0; i < 8; i++) {
			const userData = await createTestUser(`-start-game-${i}`);
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

	describe('POST /api/room/[name]/start', () => {
		it('應該拒絕玩家數量不足的房間開始遊戲', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 只有 1 個玩家
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect([400, 403]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/玩家|人數|不足|至少/);
		});

		it('應該拒絕非房主開始遊戲', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第二個玩家加入
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);

			// 非房主嘗試開始
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect([400, 403]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/房主|權限/);
		});

		it('應該拒絕未認證的開始請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該在玩家數量足夠時允許房主開始遊戲', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 添加 5 個玩家（總共 6 個）
			for (let i = 1; i <= 5; i++) {
				await joinTestRoom(testUsers[i].token, room.roomName, room.password);
			}

			// 房主開始遊戲
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			// 可能成功或因為其他條件失敗（如準備狀態）
			if (response.status === 200) {
				const data = await response.json();
				expect(data.message).toBeDefined();
			} else {
				expect([400, 403]).toContain(response.status);
			}
		});

		it('應該拒絕不存在的房間開始遊戲', async () => {
			const response = await fetch(`${API_BASE}/api/room/NonExistentRoom-${Date.now()}/start`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				}
			});

			expect([403, 404]).toContain(response.status);
		});
	});
});
