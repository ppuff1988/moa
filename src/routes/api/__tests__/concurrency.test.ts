import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, wait } from './helpers';

describe('Concurrency and Race Conditions', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 10; i++) {
			const userData = await createTestUser(`-concurrency-${i}`);
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

	describe('Concurrent Room Creation', () => {
		it('應該允許多個用戶同時創建房間並自動生成不同的房間名稱', async () => {
			// 兩個用戶同時創建房間
			const requests = [
				fetch(`${API_BASE}/api/room/create`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						password: 'test123'
					})
				}),
				fetch(`${API_BASE}/api/room/create`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						password: 'test456'
					})
				})
			];

			const responses = await Promise.all(requests);

			// 兩個都應該成功
			const successCount = responses.filter((r) => r.status === 201).length;
			expect(successCount).toBe(2);

			// 獲取生成的房間名稱
			const roomNames = [];
			for (const response of responses) {
				if (response.status === 201) {
					const data = await response.json();
					roomNames.push(data.roomName);
					testGames.push(data.gameId);
				}
			}

			// 檢查房間名稱不相同且都是6碼數字
			expect(roomNames[0]).not.toBe(roomNames[1]);
			roomNames.forEach((name) => {
				expect(name).toMatch(/^\d{6}$/);
			});
		});

		it('應該允許不同用戶同時創建多個房間', async () => {
			const requests = testUsers.slice(0, 5).map((user) =>
				fetch(`${API_BASE}/api/room/create`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${user.token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						password: 'test123'
					})
				})
			);

			const responses = await Promise.all(requests);

			// 所有請求都應該成功
			responses.forEach((response) => {
				expect(response.status).toBe(201);
			});

			// 記錄所有創建的房間並檢查房間名稱唯一性
			const roomNames = [];
			for (const response of responses) {
				const data = await response.json();
				roomNames.push(data.roomName);
				testGames.push(data.gameId);
			}

			// 檢查所有房間名稱都不相同且都是6碼數字
			const uniqueNames = new Set(roomNames);
			expect(uniqueNames.size).toBe(roomNames.length);
			roomNames.forEach((name) => {
				expect(name).toMatch(/^\d{6}$/);
			});
		});
	});

	describe('Concurrent Room Joining', () => {
		it('應該允許多個玩家同時加入房間', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 4 個玩家同時加入
			const joinRequests = testUsers.slice(1, 5).map((user) =>
				fetch(`${API_BASE}/api/room/join`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${user.token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						roomName: room.roomName,
						password: room.password
					})
				})
			);

			const responses = await Promise.all(joinRequests);

			// 所有請求都應該成功
			const successCount = responses.filter((r) => r.status === 200).length;
			expect(successCount).toBe(4);

			// 驗證房間有正確的玩家數量
			const roomInfo = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
				headers: { Authorization: `Bearer ${testUsers[0].token}` }
			});
			const roomData = await roomInfo.json();
			expect(roomData.game.playerCount).toBe(5); // 房主 + 4 個加入的玩家
		});

		it('應該防止玩家重複加入同一房間', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 同一玩家嘗試多次加入
			const requests = Array(3)
				.fill(null)
				.map(() =>
					fetch(`${API_BASE}/api/room/join`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUsers[1].token}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							roomName: room.roomName,
							password: room.password
						})
					})
				);

			const responses = await Promise.all(requests);

			// 只有一個應該成功
			const successCount = responses.filter((r) => r.status === 200).length;
			expect(successCount).toBeLessThanOrEqual(1);
		});
	});

	describe('Concurrent Ready Status Changes', () => {
		it('應該正確處理多個玩家同時切換準備狀態', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 添加更多玩家（需要至少6個玩家才能開始遊戲）
			for (let i = 1; i <= 5; i++) {
				await fetch(`${API_BASE}/api/room/join`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[i].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						roomName: room.roomName,
						password: room.password
					})
				});
			}

			// 房主啟動遊戲，進入選角階段
			const startResponse = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start-selection`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);
			const startData = await startResponse.json();
			expect(startResponse.status).toBe(200);
			expect(startData.message).toBe('成功開始遊戲，進入選角階段');

			// 等待一段時間讓所有玩家收到遊戲開始的通知
			await new Promise((resolve) => setTimeout(resolve, 500));

			// 所有玩家同時嘗試鎖定角色
			const lockPromises = testUsers.slice(0, 6).map(async (user, index) => {
				const response = await fetch(
					`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/lock-role`,
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${user.token}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							roleId: index + 1, // 每個玩家選擇不同的角色
							color: ['紅', '橙', '黃', '綠', '藍', '紫'][index] // 每個玩家選擇不同的顏色
						})
					}
				);

				const { status } = response;
				const body = await response.json();
				return { status, body };
			});

			const responses = await Promise.all(lockPromises);

			// 所有請求都應該成功
			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});
		});

		it('應該處理快速切換準備狀態', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 加入足夠的玩家以啟動遊戲
			for (let i = 1; i <= 5; i++) {
				await fetch(`${API_BASE}/api/room/join`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[i].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						roomName: room.roomName,
						password: room.password
					})
				});
			}

			// 啟動遊戲
			await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				}
			});

			// 先鎖定一次
			await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/lock-role`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[1].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					roleId: 1,
					color: 'red'
				})
			});

			// 快速切換準備狀態多次（解鎖和鎖定交替）
			const toggleRequests = [];
			for (let i = 0; i < 5; i++) {
				// 解鎖
				toggleRequests.push(
					fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/unlock-role`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUsers[1].token}`,
							'Content-Type': 'application/json'
						}
					})
				);
				// 鎖定
				toggleRequests.push(
					fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/lock-role`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUsers[1].token}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							roleId: 1,
							color: 'red'
						})
					})
				);
			}

			const responses = await Promise.all(toggleRequests);

			// 所有請求都應該得到回應（部分可能失敗因為狀態衝突）
			responses.forEach((response) => {
				expect([200, 400]).toContain(response.status);
			});
		});
	});

	describe('Concurrent Player Actions', () => {
		it('應該處理玩家同時離開房間', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 添加多個玩家
			for (let i = 1; i <= 4; i++) {
				await fetch(`${API_BASE}/api/room/join`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[i].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						roomName: room.roomName,
						password: room.password
					})
				});
			}

			// 多個玩家同時離開
			const leaveRequests = testUsers.slice(1, 4).map((user) =>
				fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/leave`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${user.token}`,
						'Content-Type': 'application/json'
					}
				})
			);

			const responses = await Promise.all(leaveRequests);

			// 所有請求都應該成功
			responses.forEach((response) => {
				expect([200, 204]).toContain(response.status);
			});
		});

		it('應該處理房主離開時的權限轉移競爭', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 添加玩家
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

			await fetch(`${API_BASE}/api/room/join`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[2].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					roomName: room.roomName,
					password: room.password
				})
			});

			// 房主離開
			await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/leave`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				}
			});

			// 等待狀態更新
			await wait(100);

			// 檢查是否有新房主
			const roomInfo = await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
				headers: { Authorization: `Bearer ${testUsers[1].token}` }
			});

			if (roomInfo.status === 200) {
				const roomData = await roomInfo.json();
				const hosts = roomData.players.filter((p: { isHost: boolean }) => p.isHost);

				// 應該恰好有一個房主
				expect(hosts.length).toBe(1);
			}
		});
	});

	describe('Data Consistency Under Load', () => {
		it('應該在高並發下保持玩家計數準確', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 多個玩家快速加入
			const joinPromises = testUsers.slice(1, 6).map((user) =>
				fetch(`${API_BASE}/api/room/join`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${user.token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						roomName: room.roomName,
						password: room.password
					})
				})
			);

			await Promise.all(joinPromises);

			// 等待所有更新完成
			await wait(200);

			// 多次查詢驗證一致性
			const infoRequests = Array(5)
				.fill(null)
				.map(() =>
					fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
						headers: { Authorization: `Bearer ${testUsers[0].token}` }
					})
				);

			const responses = await Promise.all(infoRequests);
			const data = await Promise.all(responses.map((r) => r.json()));

			// 所有查詢應該返回相同的玩家數量
			const playerCounts = data.map((d) => d.game.playerCount);
			const uniqueCounts = new Set(playerCounts);

			expect(uniqueCounts.size).toBe(1);
			expect(playerCounts[0]).toBeGreaterThan(1);
		});

		it('應該防止房間資訊的競爭條件', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 同時進行多種操作
			const operations = [
				// 玩家加入
				fetch(`${API_BASE}/api/room/join`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						roomName: room.roomName,
						password: room.password
					})
				}),
				// 查詢房間資訊
				fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
					headers: { Authorization: `Bearer ${testUsers[0].token}` }
				}),
				// 準備狀態切換
				fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/ready`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				})
			];

			const responses = await Promise.all(operations);

			// 所有操作都應該成功或返回適當的錯誤
			responses.forEach((response) => {
				expect(response.status).toBeGreaterThanOrEqual(200);
				expect(response.status).toBeLessThan(500);
			});
		});
	});

	describe('Session and Token Management', () => {
		it('應該處理同一用戶的多個並發請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 同一用戶的多個並發請求
			const requests = Array(10)
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
		});

		it('應該處理多個用戶的交叉請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 添加玩家
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

			// 兩個用戶交替發送請求
			const requests = [];
			for (let i = 0; i < 5; i++) {
				requests.push(
					fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
						headers: { Authorization: `Bearer ${testUsers[0].token}` }
					})
				);
				requests.push(
					fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`, {
						headers: { Authorization: `Bearer ${testUsers[1].token}` }
					})
				);
			}

			const responses = await Promise.all(requests);

			// 所有請求都應該成功
			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});
		});
	});
});
