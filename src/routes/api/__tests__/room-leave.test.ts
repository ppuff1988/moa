import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as createSocket, type Socket } from 'socket.io-client';
import { db } from '$lib/server/db';
import {
	user,
	games,
	gamePlayers,
	gameRounds,
	gameActions,
	gameDiscussionNotes
} from '$lib/server/db/schema';
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
		for (let i = 0; i < 6; i++) {
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
				await db.delete(gameDiscussionNotes).where(eq(gameDiscussionNotes.gameId, gameId));
				await db.delete(gameActions).where(eq(gameActions.gameId, gameId));
				await db.delete(gameRounds).where(eq(gameRounds.gameId, gameId));
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
		const leave = (roomName: string, actor: number) =>
			fetch(`${API_BASE}/api/room/${roomName}/leave`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${testUsers[actor].token}` }
			});

		it.each(['waiting', 'selecting', 'playing'])(
			'最後一人離開 %s 房間時標記終止',
			async (status) => {
				const room = await createTestRoom(testUsers[0].token);
				testGames.push(room.gameId);
				await db.update(games).set({ status }).where(eq(games.id, room.gameId));
				const response = await leave(room.roomName, 0);
				expect(response.status).toBe(200);
				expect(await response.json()).toMatchObject({ gameEnded: true });
				const [game] = await db.select().from(games).where(eq(games.id, room.gameId));
				expect(game?.status).toBe('terminated');
				expect(game?.finishedAt).toBeInstanceOf(Date);
			}
		);

		it.each(['action', 'discussion', 'voting', 'result', 'identification', 'completed'] as const)(
			'%s 階段全員同時離房只終止一次並保留歷史及筆記',
			async (phase) => {
				const room = await createTestRoom(testUsers[0].token);
				testGames.push(room.gameId);
				await joinTestRoom(testUsers[1].token, room.roomName, room.password);
				const players = await db
					.select()
					.from(gamePlayers)
					.where(eq(gamePlayers.gameId, room.gameId));
				const seats = players.map((p) => p.id);
				await db
					.update(games)
					.set({ status: 'playing', seatOrder: seats })
					.where(eq(games.id, room.gameId));
				const [round] = await db
					.insert(gameRounds)
					.values({ gameId: room.gameId, round: 1, phase, actionOrder: seats })
					.returning();
				await db.insert(gameActions).values({
					gameId: room.gameId,
					roundId: round.id,
					playerId: seats[0],
					ordering: 1,
					actionData: { type: 'test' }
				});
				await db.insert(gameDiscussionNotes).values({
					gameId: room.gameId,
					roundId: round.id,
					ownerPlayerId: seats[0],
					subjectPlayerId: seats[1],
					memo: '保留私人筆記'
				});
				const responses = await Promise.all([leave(room.roomName, 0), leave(room.roomName, 1)]);
				expect(responses.map((r) => r.status)).toEqual([200, 200]);
				const bodies = await Promise.all(responses.map((r) => r.json()));
				expect(bodies.filter((body) => body.gameEnded)).toHaveLength(1);
				const [game] = await db.select().from(games).where(eq(games.id, room.gameId));
				expect(game).toMatchObject({ status: 'terminated', seatOrder: seats, playerCount: 2 });
				const remaining = await db
					.select()
					.from(gamePlayers)
					.where(eq(gamePlayers.gameId, room.gameId));
				expect(remaining).toHaveLength(2);
				expect(remaining.every((p) => p.roomPresence === 'left' && p.leftAt !== null)).toBe(true);
				expect(
					await db.select().from(gameActions).where(eq(gameActions.roundId, round.id))
				).toHaveLength(1);
				expect(
					await db
						.select()
						.from(gameDiscussionNotes)
						.where(eq(gameDiscussionNotes.roundId, round.id))
				).toHaveLength(1);
				const rejoin = await fetch(`${API_BASE}/api/room/join`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ roomName: room.roomName, password: room.password })
				});
				expect(rejoin.status).toBe(400);
			}
		);

		it.each([0, 1])('選角中玩家 %s 離房使人數不足時，其餘玩家保留房間資格', async (actor) => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);
			for (const member of testUsers.slice(1)) {
				await joinTestRoom(member.token, room.roomName, room.password);
			}
			await db.update(games).set({ status: 'selecting' }).where(eq(games.id, room.gameId));
			const before = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, room.gameId));

			const response = await leave(room.roomName, actor);
			expect(response.status).toBe(200);
			expect(await response.json()).toMatchObject({ gameEnded: true, gamePaused: false });
			const after = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, room.gameId));
			expect(after).toHaveLength(6);
			for (const member of before) {
				const current = after.find((p) => p.id === member.id);
				if (member.userId === testUsers[actor].userId) {
					expect(current).toMatchObject({ roomPresence: 'left', isOnline: false });
					expect(current?.leftAt).toBeInstanceOf(Date);
				} else {
					expect(current).toEqual(member);
				}
			}
			const [game] = await db.select().from(games).where(eq(games.id, room.gameId));
			expect(game).toMatchObject({ status: 'terminated', playerCount: 5 });
			expect(game.finishedAt).toBeInstanceOf(Date);

			for (const [index, member] of testUsers.entries()) {
				const roomInfo = await fetch(`${API_BASE}/api/room/${room.roomName}`, {
					headers: { Authorization: `Bearer ${member.token}` }
				});
				expect(roomInfo.status).toBe(index === actor ? 403 : 200);
			}
			const remainingActor = actor === 0 ? 1 : 0;
			expect((await leave(room.roomName, remainingActor)).status).toBe(200);
			const [ended] = await db.select().from(games).where(eq(games.id, room.gameId));
			expect(ended).toMatchObject({ status: 'terminated', finishedAt: game.finishedAt });
		});

		it('finished 遊戲全員離房仍保留完成狀態與結束時間', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);
			const finishedAt = new Date('2026-09-01T00:00:00Z');
			await db
				.update(games)
				.set({ status: 'finished', finishedAt })
				.where(eq(games.id, room.gameId));
			expect((await leave(room.roomName, 0)).status).toBe(200);
			const [game] = await db.select().from(games).where(eq(games.id, room.gameId));
			expect(game).toMatchObject({ status: 'finished', finishedAt });
		});

		it('最後一人離房與舊玩家重新加入競態不會產生已終止的有效成員', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);
			await db.update(games).set({ status: 'playing' }).where(eq(games.id, room.gameId));
			expect((await leave(room.roomName, 1)).status).toBe(200);
			const [left, joined] = await Promise.all([
				leave(room.roomName, 0),
				fetch(`${API_BASE}/api/room/join`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ roomName: room.roomName, password: room.password })
				})
			]);
			expect(left.status).toBe(200);
			expect([200, 400]).toContain(joined.status);
			const [game] = await db.select().from(games).where(eq(games.id, room.gameId));
			const players = await db
				.select()
				.from(gamePlayers)
				.where(eq(gamePlayers.gameId, room.gameId));
			const active = players.filter((p) => p.roomPresence === 'active' && p.leftAt === null);
			expect(game.status).toBe(joined.ok ? 'playing' : 'terminated');
			expect(active).toHaveLength(joined.ok ? 1 : 0);
		});

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
