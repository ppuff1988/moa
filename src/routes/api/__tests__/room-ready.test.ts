import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, joinTestRoom } from './helpers';

describe('Room Ready Status API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶（至少6人才能開始選角）
		for (let i = 0; i < 6; i++) {
			const userData = await createTestUser(`-ready-${i}`);
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

	describe('POST /api/room/[name]/ready', () => {
		it('應該在未全部鎖定時返回錯誤', async () => {
			// 創建房間並開始遊戲（進入 selecting 階段）
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 加入5個玩家（房主+5人=6人，滿足最小人數）
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);
			await joinTestRoom(testUsers[2].token, room.roomName, room.password);
			await joinTestRoom(testUsers[3].token, room.roomName, room.password);
			await joinTestRoom(testUsers[4].token, room.roomName, room.password);
			await joinTestRoom(testUsers[5].token, room.roomName, room.password);

			// 房主開始遊戲
			await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				}
			});

			// 房主檢查準備狀態（應該失敗，因為沒有人鎖定角色）
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/ready`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toMatch(/尚未鎖定|notReadyCount/);
		});

		it('應該拒絕非房主調用', async () => {
			// 創建房間並開始遊戲
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 加入5個玩家（房主+5人=6人）
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);
			await joinTestRoom(testUsers[2].token, room.roomName, room.password);
			await joinTestRoom(testUsers[3].token, room.roomName, room.password);
			await joinTestRoom(testUsers[4].token, room.roomName, room.password);
			await joinTestRoom(testUsers[5].token, room.roomName, room.password);

			// 房主開始遊戲
			await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				}
			});

			// 非房主玩家嘗試檢查準備狀態（應該失敗）
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/ready`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect(response.status).toBe(403);
		});

		it('應該在遊戲未進入選角階段時拒絕', async () => {
			// 創建房間但不開始遊戲（保持在 waiting 狀態）
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第二和第三個玩家加入
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);
			await joinTestRoom(testUsers[2].token, room.roomName, room.password);

			// 房主嘗試檢查準備狀態（應該失敗，因為遊戲還在 waiting 狀態）
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/ready`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect(response.status).toBe(400);
		});

		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/ready`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕不在房間中的玩家準備', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 未加入房間的玩家嘗試準備
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/ready`,
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

		it('應該拒絕在不存在的房間中準備', async () => {
			const response = await fetch(`${API_BASE}/api/room/NonExistentRoom-${Date.now()}/ready`, {
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
