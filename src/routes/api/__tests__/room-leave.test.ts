import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, joinTestRoom } from './helpers';

describe('Room Leave API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 4; i++) {
			const userData = await createTestUser(`-leave-${i}`);
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

	describe('POST /api/room/[name]/leave', () => {
		it('應該允許非房主玩家離開房間', async () => {
			// 創建房間
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第二個玩家加入
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);

			// 第二個玩家離開
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/leave`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.message).toContain('離開');

			// 驗證玩家已離開
			const roomInfo = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
				headers: { Authorization: `Bearer ${testUsers[0].token}` }
			});
			const roomData = await roomInfo.json();

			const leftPlayer = roomData.players.find(
				(p: { userId: number }) => p.userId === testUsers[1].userId
			);
			expect(leftPlayer).toBeUndefined();
		});

		it('應該在房主離開時轉移房主權限', async () => {
			// 創建房間
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第二個玩家加入
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);

			// 房主離開
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/leave`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect([200, 204]).toContain(response.status);

			// 驗證新房主
			const roomInfo = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
				headers: { Authorization: `Bearer ${testUsers[1].token}` }
			});
			const roomData = await roomInfo.json();

			const newHost = roomData.players.find(
				(p: { userId: number }) => p.userId === testUsers[1].userId
			);
			expect(newHost?.isHost).toBe(true);
		});

		it('應該在最後一個玩家離開時關閉房間', async () => {
			// 創建房間
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 房主離開（唯一玩家）
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/leave`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect([200, 204]).toContain(response.status);

			// 驗證房間不存在或沒有玩家
			const roomInfo = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
				headers: { Authorization: `Bearer ${testUsers[0].token}` }
			});

			// 可能返回 404 或 403
			expect([403, 404]).toContain(roomInfo.status);
		});

		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/leave`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕不在房間中的玩家離開', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 未加入房間的玩家嘗試離開
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/leave`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[2].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect([400, 403, 404]).toContain(response.status);
		});

		it('應該拒絕從不存在的房間離開', async () => {
			const response = await fetch(`${API_BASE}/api/room/NonExistentRoom-${Date.now()}/leave`, {
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
