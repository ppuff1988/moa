import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, joinTestRoom } from './helpers';

describe('Room Kick Player API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 4; i++) {
			const userData = await createTestUser(`-kick-${i}`);
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

	describe('POST /api/room/[name]/kick', () => {
		it('應該允許房主踢出其他玩家', async () => {
			// 創建房間
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第二個玩家加入
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);

			// 房主踢出玩家
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/kick`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						targetUserId: testUsers[1].userId
					})
				}
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.message).toContain('踢出');

			// 驗證玩家已被踢出
			const roomInfo = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
				headers: { Authorization: `Bearer ${testUsers[0].token}` }
			});
			const roomData = await roomInfo.json();

			const kickedPlayer = roomData.players.find(
				(p: { userId: number }) => p.userId === testUsers[1].userId
			);
			expect(kickedPlayer).toBeUndefined();
		});

		it('應該拒絕非房主玩家踢出其他人', async () => {
			// 創建房間
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第二和第三個玩家加入
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);
			await joinTestRoom(testUsers[2].token, room.roomName, room.password);

			// 非房主玩家嘗試踢出其他玩家
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/kick`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						targetUserId: testUsers[2].userId
					})
				}
			);

			expect([400, 403]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/房主|權限/);
		});

		it('應該拒絕房主踢出自己', async () => {
			// 創建房間
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 房主嘗試踢出自己
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/kick`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						targetUserId: testUsers[0].userId
					})
				}
			);

			expect([400, 403]).toContain(response.status);
		});

		it('應該拒絕踢出不在房間中的玩家', async () => {
			// 創建房間
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 嘗試踢出未加入的玩家
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/kick`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						targetUserId: testUsers[2].userId
					})
				}
			);

			expect([400, 404]).toContain(response.status);
		});

		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/kick`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						targetUserId: testUsers[1].userId
					})
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕缺少 targetUserId 的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/kick`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({})
				}
			);

			expect(response.status).toBe(400);
		});

		it('應該拒絕無效的 targetUserId', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/kick`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						targetUserId: 'invalid'
					})
				}
			);

			expect([400, 404]).toContain(response.status);
		});
	});
});
