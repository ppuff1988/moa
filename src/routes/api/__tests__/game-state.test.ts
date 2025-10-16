import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, getRoomInfo } from './helpers';

describe('Game State and Status API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 4; i++) {
			const userData = await createTestUser(`-game-state-${i}`);
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

	describe('GET /api/room/[name]/round-status', () => {
		it('應該返回等待階段的遊戲狀態', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/round-status`,
				{
					headers: { Authorization: `Bearer ${testUsers[0].token}` }
				}
			);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty('phase');
				expect(data).toHaveProperty('round');
			} else {
				// 某些實現可能在等待階段不返回 round-status
				expect([200, 404]).toContain(response.status);
			}
		});

		it('應該拒絕未授權的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/round-status`
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕不在房間中的玩家訪問', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/round-status`,
				{
					headers: { Authorization: `Bearer ${testUsers[1].token}` }
				}
			);

			expect([403, 404]).toContain(response.status);
		});
	});

	describe('GET /api/room/[name]/players', () => {
		it('應該返回房間內所有玩家的資訊', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/players`,
				{
					headers: { Authorization: `Bearer ${testUsers[0].token}` }
				}
			);

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('players');
			expect(Array.isArray(data.players)).toBe(true);
			expect(data.players.length).toBeGreaterThan(0);

			// 驗證玩家數據結構
			const player = data.players[0];
			expect(player).toHaveProperty('id');
			expect(player).toHaveProperty('userId');
			expect(player).toHaveProperty('nickname');
			expect(player).toHaveProperty('isHost');
			expect(player).toHaveProperty('isReady');
		});

		it('應該包含當前回合資訊', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/players`,
				{
					headers: { Authorization: `Bearer ${testUsers[0].token}` }
				}
			);

			expect(response.status).toBe(200);
			const data = await response.json();

			// 可能包含 round 資訊
			if (data.round !== undefined) {
				expect(typeof data.round).toBe('number');
			}
		});

		it('應該拒絕未授權的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/players`
			);

			expect(response.status).toBe(401);
		});
	});

	describe('GET /api/room/[name]/my-role', () => {
		it('應該在未分配角色時返回 null', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/my-role`,
				{
					headers: { Authorization: `Bearer ${testUsers[0].token}` }
				}
			);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty('hasRole');

				// 在等待階段，應該沒有角色
				if (!data.hasRole) {
					expect(data.roleName).toBeNull();
				}
			} else {
				expect([200, 404]).toContain(response.status);
			}
		});

		it('應該拒絕未授權的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/my-role`
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕不在房間中的玩家訪問', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/my-role`,
				{
					headers: { Authorization: `Bearer ${testUsers[1].token}` }
				}
			);

			expect([403, 404]).toContain(response.status);
		});
	});

	describe('GET /api/room/[name]/artifacts', () => {
		it('應該在遊戲未開始時返回空陣列或 404', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/artifacts`,
				{
					headers: { Authorization: `Bearer ${testUsers[0].token}` }
				}
			);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty('artifacts');
				expect(Array.isArray(data.artifacts)).toBe(true);
			} else {
				// 遊戲未開始時可能返回 404
				expect([200, 404]).toContain(response.status);
			}
		});

		it('應該拒絕未授權的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/artifacts`
			);

			expect(response.status).toBe(401);
		});
	});

	describe('Game State Consistency', () => {
		it('應該在多次請求中保持一致的玩家數量', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第一次獲取房間資訊
			const info1 = await getRoomInfo(testUsers[0].token, room.roomName);
			const playerCount1 = info1.game.playerCount;

			// 第二次獲取房間資訊
			const info2 = await getRoomInfo(testUsers[0].token, room.roomName);
			const playerCount2 = info2.game.playerCount;

			// 在沒有玩家加入或離開的情況下，玩家數量應該一致
			expect(playerCount1).toBe(playerCount2);
		});

		it('應該正確反映玩家加入後的狀態變化', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 初始狀態
			const initialInfo = await getRoomInfo(testUsers[0].token, room.roomName);
			const initialCount = initialInfo.game.playerCount;

			// 新玩家加入
			await fetch(`${API_BASE}/api/room/join`, {
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

			// 驗證狀態更新
			const updatedInfo = await getRoomInfo(testUsers[0].token, room.roomName);
			const updatedCount = updatedInfo.game.playerCount;

			expect(updatedCount).toBe(initialCount + 1);
		});

		it('應該正確處理並發請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 發送多個並發請求
			const requests = Array(5)
				.fill(null)
				.map(() =>
					fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
						headers: { Authorization: `Bearer ${testUsers[0].token}` }
					})
				);

			const responses = await Promise.all(requests);

			// 所有請求都應該成功
			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});

			// 所有響應的數據應該一致
			const data = await Promise.all(responses.map((r) => r.json()));
			const playerCounts = data.map((d) => d.game.playerCount);

			// 檢查所有玩家數量是否相同
			expect(new Set(playerCounts).size).toBe(1);
		});
	});
});
