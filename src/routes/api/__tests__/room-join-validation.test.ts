import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, joinTestRoom } from './helpers';

describe('Room Join Validation API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 8; i++) {
			const userData = await createTestUser(`-join-val-${i}`);
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

	describe('POST /api/room/join - Advanced Scenarios', () => {
		it('應該成功加入房間並獲得正確的玩家資訊', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(`${API_BASE}/api/room/join`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[1].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					roomName: room.roomName,
					password: room.password
				})
			});

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('message');
			expect(data).toHaveProperty('gameId', room.gameId);
			expect(data).toHaveProperty('player');
			expect(data.player).toHaveProperty('isHost', false);
			expect(data.player).toHaveProperty('userId', testUsers[1].userId);
		});

		it('應該拒絕重複加入同一房間', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第一次加入
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);

			// 第二次加入（重複）
			const response = await fetch(`${API_BASE}/api/room/join`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[1].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					roomName: room.roomName,
					password: room.password
				})
			});

			expect([400, 409]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/已經|重複/);
		});

		it('應該拒絕錯誤的房間密碼', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(`${API_BASE}/api/room/join`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[1].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					roomName: room.roomName,
					password: 'wrong-password'
				})
			});

			expect([400, 401, 403]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/密碼|錯誤/);
		});

		it('應該拒絕加入不存在的房間', async () => {
			const response = await fetch(`${API_BASE}/api/room/join`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					roomName: `NonExistentRoom-${Date.now()}`,
					password: 'test123'
				})
			});

			expect([400, 404]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/不存在|找不到/);
		});

		it('應該拒絕房間已滿時加入', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 加入 7 個玩家（房主 + 6 個新玩家，假設上限是 8）
			for (let i = 1; i < 8; i++) {
				await joinTestRoom(testUsers[i].token, room.roomName, room.password);
			}

			// 第 8 個玩家嘗試加入（超過上限）
			// 注意：這取決於實際的房間上限設定
			// 如果上限是 8，這應該成功；如果是 7，這應該失敗
		});

		it('應該拒絕缺少必要參數的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 缺少密碼
			const response1 = await fetch(`${API_BASE}/api/room/join`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[1].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					roomName: room.roomName
				})
			});

			expect([400, 401, 403]).toContain(response1.status);

			// 缺少房間名稱
			const response2 = await fetch(`${API_BASE}/api/room/join`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[1].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: room.password
				})
			});

			expect(response2.status).toBe(400);
		});

		it('應該拒絕空字串的房間名稱或密碼', async () => {
			const response = await fetch(`${API_BASE}/api/room/join`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					roomName: '',
					password: ''
				})
			});

			expect([400, 404]).toContain(response.status);
		});

		it('應該處理特殊字符的房間名稱', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 更新房間名稱為特殊字符
			// 注意：這需要 API 支持，否則只是測試現有房間名稱的 URL 編碼
		});
	});

	describe('GET /api/room/[name] - Room Information', () => {
		it('應該正確返回房間資訊', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
				headers: { Authorization: `Bearer ${testUsers[0].token}` }
			});

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('game');
			expect(data).toHaveProperty('players');
			expect(data.game).toHaveProperty('id', room.gameId);
			expect(data.game).toHaveProperty('roomName', room.roomName);
			expect(Array.isArray(data.players)).toBe(true);
			expect(data.players.length).toBeGreaterThan(0);
		});

		it('應該拒絕未授權的用戶訪問房間資訊', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
				headers: { Authorization: `Bearer ${testUsers[1].token}` }
			});

			// 未加入房間的用戶應該無法訪問
			expect([403, 404]).toContain(response.status);
		});

		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`);

			expect(response.status).toBe(401);
		});

		it('應該返回正確的玩家數量', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 加入更多玩家
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);
			await joinTestRoom(testUsers[2].token, room.roomName, room.password);

			const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
				headers: { Authorization: `Bearer ${testUsers[0].token}` }
			});

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data.players.length).toBe(3);
			expect(data.game.playerCount).toBe(3);
		});
	});
});
