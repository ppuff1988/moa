import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as createSocket, type Socket } from 'socket.io-client';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, joinTestRoom } from './helpers';

describe('Room Leave API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	function connectAndJoinRoom(token: string, roomName: string): Promise<Socket> {
		return new Promise((resolve, reject) => {
			const socket = createSocket(API_BASE, {
				auth: { token },
				forceNew: true,
				transports: ['polling']
			});
			const timeout = setTimeout(() => {
				socket.close();
				reject(new Error(`Socket 加入房間逾時: ${roomName}`));
			}, 10000);

			const fail = (error: Error) => {
				clearTimeout(timeout);
				socket.close();
				reject(error);
			};
			socket.once('connect_error', fail);
			socket.once('connect', () => {
				socket.once('room-update', () => {
					clearTimeout(timeout);
					socket.off('connect_error', fail);
					resolve(socket);
				});
				socket.emit('join-room', roomName);
			});
		});
	}

	async function waitForPlayer(
		gameId: string,
		userId: number,
		predicate: (player: typeof gamePlayers.$inferSelect) => boolean
	) {
		for (let attempt = 0; attempt < 40; attempt += 1) {
			const [player] = await db
				.select()
				.from(gamePlayers)
				.where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)))
				.limit(1);
			if (player && predicate(player)) return player;
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		throw new Error(`等待玩家 presence 狀態逾時: ${userId}`);
	}

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

		it('遊戲進行中明確離開時保留歷史且不強制結束', async () => {
			// 創建房間
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第二個玩家加入
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);

			// 模擬遊戲狀態為 playing
			await db.update(games).set({ status: 'playing' }).where(eq(games.id, room.gameId));

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
			expect(data.message).toContain('重新加入');
			expect(data.gamePaused).toBe(true);

			// 驗證玩家已離開目前房間，重新加入必須走加入房間流程
			const playerRow = await db
				.select()
				.from(gamePlayers)
				.where(
					and(eq(gamePlayers.gameId, room.gameId), eq(gamePlayers.userId, testUsers[1].userId))
				)
				.limit(1);
			expect(playerRow[0]?.leftAt).toBeInstanceOf(Date);
			expect(playerRow[0]?.isOnline).toBe(false);
			expect(playerRow[0]?.roomPresence).toBe('left');

			const [gameRow] = await db.select().from(games).where(eq(games.id, room.gameId)).limit(1);
			expect(gameRow.status).toBe('playing');

			const roomAfterLeave = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`,
				{ headers: { Authorization: `Bearer ${testUsers[1].token}` } }
			);
			expect(roomAfterLeave.status).toBe(403);

			const rejoinResponse = await joinTestRoom(testUsers[1].token, room.roomName, room.password);
			expect(rejoinResponse.player.userId).toBe(testUsers[1].userId);
			const rejoinedPlayer = await db
				.select()
				.from(gamePlayers)
				.where(
					and(eq(gamePlayers.gameId, room.gameId), eq(gamePlayers.userId, testUsers[1].userId))
				)
				.limit(1);
			expect(rejoinedPlayer[0]?.leftAt).toBeNull();
			expect(rejoinedPlayer[0]?.roomPresence).toBe('active');
		});

		it('Socket 暫時斷線不會暫停遊戲，重新連線後明確離開才會等待回來', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);
			await db.update(games).set({ status: 'playing' }).where(eq(games.id, room.gameId));

			let hostSocket: Socket | undefined;
			let playerSocket: Socket | undefined;
			try {
				hostSocket = await connectAndJoinRoom(testUsers[0].token, room.roomName);
				playerSocket = await connectAndJoinRoom(testUsers[1].token, room.roomName);

				playerSocket.disconnect();
				const temporarilyDisconnected = await waitForPlayer(
					room.gameId,
					testUsers[1].userId,
					(player) => !player.isOnline && player.roomPresence === 'active'
				);
				expect(temporarilyDisconnected.roomPresence).toBe('active');
				const [gameAfterDisconnect] = await db
					.select()
					.from(games)
					.where(eq(games.id, room.gameId))
					.limit(1);
				expect(gameAfterDisconnect.status).toBe('playing');

				playerSocket = await connectAndJoinRoom(testUsers[1].token, room.roomName);
				await waitForPlayer(
					room.gameId,
					testUsers[1].userId,
					(player) => player.isOnline === true && player.roomPresence === 'active'
				);

				const leftRoomEvent = new Promise<{ userId: number }>((resolve, reject) => {
					const timeout = setTimeout(
						() => reject(new Error('等待 player-left-room 事件逾時')),
						10000
					);
					hostSocket?.once('player-left-room', (payload: { userId: number }) => {
						clearTimeout(timeout);
						resolve(payload);
					});
				});
				const response = await fetch(
					`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/leave`,
					{
						method: 'POST',
						headers: { Authorization: `Bearer ${testUsers[1].token}` }
					}
				);

				expect(response.status).toBe(200);
				expect((await response.json()).gamePaused).toBe(true);
				expect(await leftRoomEvent).toMatchObject({ userId: testUsers[1].userId });
				const explicitlyLeft = await waitForPlayer(
					room.gameId,
					testUsers[1].userId,
					(player) => !player.isOnline && player.roomPresence === 'left' && player.leftAt !== null
				);
				expect(explicitlyLeft.leftAt).toBeInstanceOf(Date);
			} finally {
				hostSocket?.close();
				playerSocket?.close();
			}
		});
	});
});
