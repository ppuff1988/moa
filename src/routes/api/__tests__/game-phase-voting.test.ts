import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers, gameArtifacts, gameRounds } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, joinTestRoom } from './helpers';

describe('Game Phase APIs - Discussion and Voting', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 8; i++) {
			const userData = await createTestUser(`-voting-${i}`);
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
				await db.delete(gameArtifacts).where(eq(gameArtifacts.gameId, gameId));
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

	async function createVotingGame(onlineVotingEnabled: boolean = false, playerCount: number = 2) {
		const room = await createTestRoom(testUsers[0].token, { onlineVotingEnabled });
		testGames.push(room.gameId);
		for (let index = 1; index < playerCount; index++) {
			await joinTestRoom(testUsers[index].token, room.roomName, room.password);
		}
		if (onlineVotingEnabled) {
			await Promise.all([
				db
					.update(gamePlayers)
					.set({ color: '紅', colorCode: '#EF4444' })
					.where(
						and(eq(gamePlayers.gameId, room.gameId), eq(gamePlayers.userId, testUsers[0].userId))
					),
				db
					.update(gamePlayers)
					.set({ color: '藍', colorCode: '#3B82F6' })
					.where(
						and(eq(gamePlayers.gameId, room.gameId), eq(gamePlayers.userId, testUsers[1].userId))
					)
			]);
		}

		await db.update(games).set({ status: 'playing' }).where(eq(games.id, room.gameId));
		await db.insert(gameRounds).values({
			gameId: room.gameId,
			round: 1,
			phase: 'voting'
		});

		const artifacts = await db
			.insert(gameArtifacts)
			.values([
				{ gameId: room.gameId, round: 1, animal: '鼠', isGenuine: true },
				{ gameId: room.gameId, round: 1, animal: '牛', isGenuine: false },
				{ gameId: room.gameId, round: 1, animal: '虎', isGenuine: true },
				{ gameId: room.gameId, round: 1, animal: '兔', isGenuine: false }
			])
			.returning();

		return { ...room, artifacts };
	}

	async function createNextVotingRound(gameId: string, round: number, animals: string[]) {
		await db.insert(gameRounds).values({ gameId, round, phase: 'voting' });
		return db
			.insert(gameArtifacts)
			.values(
				animals.map((animal, index) => ({
					gameId,
					round,
					animal,
					isGenuine: index % 2 === 0
				}))
			)
			.returning();
	}

	async function submitOnlineVotes(roomName: string, token: string, votes: Record<number, number>) {
		return fetch(`${API_BASE}/api/room/${encodeURIComponent(roomName)}/online-voting`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ votes })
		});
	}

	describe('GET /api/room/[name]/online-voting', () => {
		it('第一輪開始時回傳玩家可用的 2 枚籌碼且不公開結果', async () => {
			const room = await createVotingGame(true);
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/online-voting`,
				{ headers: { Authorization: `Bearer ${testUsers[0].token}` } }
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toMatchObject({
				onlineVotingEnabled: true,
				round: 1,
				chipBalance: 2,
				totalPlayers: 2,
				hasSubmitted: false,
				votingResult: null
			});
			expect(data.submittedPlayers).toEqual([]);
		});

		it('提交後鎖定自己的票且只公開已提交顏色', async () => {
			const room = await createVotingGame(true);
			const endpoint = `${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/online-voting`;
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ votes: { [room.artifacts[0].id]: 1 } })
			});

			expect(response.status).toBe(200);
			expect(await response.json()).toMatchObject({
				completed: false,
				chipBalance: 1,
				hasSubmitted: true
			});

			const otherPlayerState = await fetch(endpoint, {
				headers: { Authorization: `Bearer ${testUsers[1].token}` }
			}).then((stateResponse) => stateResponse.json());

			expect(otherPlayerState.votingResult).toBeNull();
			expect(otherPlayerState.ownVotes).toEqual({});
			expect(otherPlayerState.submittedPlayers).toEqual([
				expect.objectContaining({ color: '紅', colorCode: '#EF4444' })
			]);
			expect(otherPlayerState).not.toHaveProperty('voteTotals');
		});

		it('最後一位玩家提交後自動公布四個獸首的彩色籌碼明細', async () => {
			const room = await createVotingGame(true);
			const endpoint = `${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`;
			const [mouse, ox] = room.artifacts;
			const orderedPlayers = await db
				.select({ id: gamePlayers.id })
				.from(gamePlayers)
				.where(eq(gamePlayers.gameId, room.gameId));
			await db
				.update(gameRounds)
				.set({ actionOrder: [...orderedPlayers.map((player) => player.id)].reverse() })
				.where(eq(gameRounds.gameId, room.gameId));

			const hostResponse = await fetch(`${endpoint}/online-voting`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ votes: { [mouse.id]: 1, [ox.id]: 1 } })
			});
			expect(hostResponse.status).toBe(200);
			expect((await hostResponse.json()).completed).toBe(false);

			const finalResponse = await fetch(`${endpoint}/online-voting`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[1].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ votes: { [mouse.id]: 1 } })
			});
			expect(finalResponse.status).toBe(200);
			const completed = await finalResponse.json();
			expect(completed.completed).toBe(true);
			expect(completed.votingResult).toMatchObject({
				round: 1,
				firstPlace: { id: mouse.id, animal: '鼠', votes: 2, rank: 1 },
				secondPlace: { id: ox.id, animal: '牛', votes: 1, rank: 2, isGenuine: false }
			});
			expect(completed.votingResult.artifacts).toHaveLength(4);
			expect(completed.votingResult.artifacts).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: mouse.id,
						votes: 2,
						colorBreakdown: [
							{ color: '紅', colorCode: '#EF4444', chips: 1 },
							{ color: '藍', colorCode: '#3B82F6', chips: 1 }
						]
					}),
					expect.objectContaining({
						id: ox.id,
						votes: 1,
						colorBreakdown: [{ color: '紅', colorCode: '#EF4444', chips: 1 }]
					})
				])
			);

			const roundStatus = await fetch(`${endpoint}/round-status`, {
				headers: { Authorization: `Bearer ${testUsers[0].token}` }
			}).then((response) => response.json());
			expect(roundStatus.phase).toBe('result');
			expect(roundStatus.votingResult).toEqual(completed.votingResult);

			const history = await fetch(`${endpoint}/action-history`, {
				headers: { Authorization: `Bearer ${testUsers[0].token}` }
			}).then((response) => response.json());
			const roundHistory = history.rounds[0];
			expect(roundHistory.playerOrder.map((item: { playerId: number }) => item.playerId)).toEqual(
				orderedPlayers.map((player) => player.id)
			);
			expect(roundHistory.votingResult).toMatchObject({
				firstPlace: { id: mouse.id, animal: '鼠', rank: 1 },
				secondPlace: { id: ox.id, animal: '牛', rank: 2, isGenuine: false }
			});
			expect(roundHistory.votingResult.firstPlace).not.toHaveProperty('isGenuine');
			expect(roundHistory.votingResult.artifacts).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: mouse.id,
						votes: 2,
						colorBreakdown: expect.arrayContaining([
							expect.objectContaining({ color: '紅', colorCode: '#EF4444', chips: 1 }),
							expect.objectContaining({ color: '藍', colorCode: '#3B82F6', chips: 1 })
						])
					})
				])
			);
		});

		it('未使用籌碼逐輪累積且第三輪必須全部投完', async () => {
			const room = await createVotingGame(true);
			await submitOnlineVotes(room.roomName, testUsers[0].token, {});
			await submitOnlineVotes(room.roomName, testUsers[1].token, {});

			await createNextVotingRound(room.gameId, 2, ['龍', '蛇', '馬', '羊']);
			const roundTwoState = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/online-voting`,
				{ headers: { Authorization: `Bearer ${testUsers[0].token}` } }
			).then((response) => response.json());
			expect(roundTwoState.chipBalance).toBe(4);

			await submitOnlineVotes(room.roomName, testUsers[0].token, {});
			await submitOnlineVotes(room.roomName, testUsers[1].token, {});
			const roundThreeArtifacts = await createNextVotingRound(room.gameId, 3, [
				'猴',
				'雞',
				'狗',
				'豬'
			]);

			const roundThreeState = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/online-voting`,
				{ headers: { Authorization: `Bearer ${testUsers[0].token}` } }
			).then((response) => response.json());
			expect(roundThreeState.chipBalance).toBe(6);

			const incompleteResponse = await submitOnlineVotes(room.roomName, testUsers[0].token, {
				[roundThreeArtifacts[0].id]: 5
			});
			expect(incompleteResponse.status).toBe(400);
			expect((await incompleteResponse.json()).message).toContain('全部');

			const validHostResponse = await submitOnlineVotes(room.roomName, testUsers[0].token, {
				[roundThreeArtifacts[0].id]: 6
			});
			expect(validHostResponse.status).toBe(200);
			expect(await validHostResponse.json()).toMatchObject({ completed: false, chipBalance: 0 });

			const validPlayerResponse = await submitOnlineVotes(room.roomName, testUsers[1].token, {
				[roundThreeArtifacts[1].id]: 6
			});
			expect(validPlayerResponse.status).toBe(200);
			expect((await validPlayerResponse.json()).completed).toBe(true);
		});

		it('當輪獸首資料不完整時拒絕玩家提交', async () => {
			const room = await createVotingGame(true);
			await db.delete(gameArtifacts).where(eq(gameArtifacts.id, room.artifacts[3].id));

			const response = await submitOnlineVotes(room.roomName, testUsers[0].token, {});
			expect(response.status).toBe(400);
			expect((await response.json()).message).toContain('獸首資料不完整');
		});

		it('全員零票時仍依十二生肖順序決定前兩名', async () => {
			const room = await createVotingGame(true);
			await submitOnlineVotes(room.roomName, testUsers[0].token, {});
			const response = await submitOnlineVotes(room.roomName, testUsers[1].token, {});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.votingResult.firstPlace).toMatchObject({ animal: '鼠', votes: 0, rank: 1 });
			expect(data.votingResult.secondPlace).toMatchObject({ animal: '牛', votes: 0, rank: 2 });
			expect(
				data.votingResult.artifacts.every(
					(artifact: { colorBreakdown: unknown[] }) => artifact.colorBreakdown.length === 0
				)
			).toBe(true);
		});

		it('玩家提交後不可重複提交或修改', async () => {
			const room = await createVotingGame(true);
			const firstResponse = await submitOnlineVotes(room.roomName, testUsers[0].token, {});
			expect(firstResponse.status).toBe(200);

			const duplicateResponse = await submitOnlineVotes(room.roomName, testUsers[0].token, {
				[room.artifacts[0].id]: 1
			});
			expect(duplicateResponse.status).toBe(409);
			expect((await duplicateResponse.json()).message).toContain('已提交');
		});

		it('兩位玩家並行提交時只由最後完成者結算一次', async () => {
			const room = await createVotingGame(true);
			const responses = await Promise.all([
				submitOnlineVotes(room.roomName, testUsers[0].token, {
					[room.artifacts[0].id]: 1
				}),
				submitOnlineVotes(room.roomName, testUsers[1].token, {
					[room.artifacts[1].id]: 1
				})
			]);

			expect(responses.map((response) => response.status)).toEqual([200, 200]);
			const results = await Promise.all(responses.map((response) => response.json()));
			expect(results.map((result) => result.completed).sort()).toEqual([false, true]);

			const [round] = await db.select().from(gameRounds).where(eq(gameRounds.gameId, room.gameId));
			expect(round.phase).toBe('result');
		});

		it('暫時斷線玩家仍列入投票門檻並等待其回來', async () => {
			const room = await createVotingGame(true);
			await db
				.update(gamePlayers)
				.set({ isOnline: false })
				.where(
					and(eq(gamePlayers.gameId, room.gameId), eq(gamePlayers.userId, testUsers[1].userId))
				);

			const response = await submitOnlineVotes(room.roomName, testUsers[0].token, {});

			expect(response.status).toBe(200);
			expect((await response.json()).completed).toBe(false);
		});

		it('主動離開玩家不再列入待提交門檻且不能再投票', async () => {
			const room = await createVotingGame(true);
			await db
				.update(gamePlayers)
				.set({ leftAt: new Date() })
				.where(
					and(eq(gamePlayers.gameId, room.gameId), eq(gamePlayers.userId, testUsers[1].userId))
				);

			const departedResponse = await submitOnlineVotes(room.roomName, testUsers[1].token, {});
			expect(departedResponse.status).toBe(403);
			expect((await departedResponse.json()).message).toContain('已離開');

			const hostResponse = await submitOnlineVotes(room.roomName, testUsers[0].token, {});
			expect(hostResponse.status).toBe(200);
			expect((await hostResponse.json()).completed).toBe(true);
		});

		it('七人局最後一位待投玩家主動離開時立即完成投票', async () => {
			const room = await createVotingGame(true, 7);
			for (let index = 0; index < 6; index++) {
				const response = await submitOnlineVotes(room.roomName, testUsers[index].token, {});
				expect(response.status).toBe(200);
				expect((await response.json()).completed).toBe(false);
			}

			const leaveResponse = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/leave`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[6].token}`,
						'Content-Type': 'application/json'
					}
				}
			);
			expect(leaveResponse.status).toBe(200);
			expect((await leaveResponse.json()).votingCompleted).toBe(true);

			const [round] = await db.select().from(gameRounds).where(eq(gameRounds.gameId, room.gameId));
			expect(round.phase).toBe('result');
		});

		it('未開啟線上投票的房間拒絕玩家投票端點', async () => {
			const room = await createVotingGame(false);
			const response = await submitOnlineVotes(room.roomName, testUsers[0].token, {});
			expect(response.status).toBe(400);
			expect((await response.json()).message).toContain('未開啟線上投票');
		});
	});

	describe('POST /api/room/[name]/start-discussion', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start-discussion`,
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
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start-discussion`,
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

	describe('POST /api/room/[name]/start-voting', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start-voting`,
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
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start-voting`,
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

	describe('POST /api/room/[name]/submit-votes', () => {
		it('線上投票房間應該拒絕房主手動輸入總票數', async () => {
			const room = await createVotingGame(true);
			const votes = Object.fromEntries(room.artifacts.map((artifact) => [artifact.id, 1]));
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/submit-votes`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ votes })
				}
			);

			expect(response.status).toBe(400);
			expect((await response.json()).message).toContain('線上投票');
		});

		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/submit-votes`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ votes: [1, 2, 3] })
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕缺少 votes 的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/submit-votes`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({})
				}
			);

			expect([400, 403]).toContain(response.status);
		});

		it('應該拒絕無效的 votes 格式', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/submit-votes`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ votes: 'not-an-array' })
				}
			);

			expect([400, 403]).toContain(response.status);
		});

		it('應該拒絕空的 votes 陣列', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/submit-votes`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ votes: [] })
				}
			);

			expect([400, 403]).toContain(response.status);
		});
	});

	describe('公開投票結果一致性', () => {
		it('只允許房主提交，並讓所有玩家從 round-status 取得同一結果', async () => {
			const room = await createVotingGame();
			const endpoint = `${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`;

			const beforeResult = await fetch(`${endpoint}/round-status`, {
				headers: { Authorization: `Bearer ${testUsers[1].token}` }
			});
			expect(beforeResult.status).toBe(200);
			expect((await beforeResult.json()).votingResult).toBeNull();

			const privateArtifacts = await fetch(`${endpoint}/artifacts`, {
				headers: { Authorization: `Bearer ${testUsers[1].token}` }
			}).then((response) => response.json());
			expect(privateArtifacts.artifacts).not.toEqual([]);
			expect(
				privateArtifacts.artifacts.every((artifact: object) => !('isGenuine' in artifact))
			).toBe(true);

			const votes = Object.fromEntries(
				room.artifacts.map((artifact) => [
					artifact.id,
					artifact.animal === '鼠' ? 5 : ['牛', '虎'].includes(artifact.animal) ? 3 : 0
				])
			);

			const nonHostResponse = await fetch(`${endpoint}/submit-votes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[1].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ votes })
			});
			expect(nonHostResponse.status).toBe(403);

			const submitResponse = await fetch(`${endpoint}/submit-votes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ votes })
			});
			expect(submitResponse.status).toBe(200);
			const submitted = await submitResponse.json();

			expect(submitted.votingResult.firstPlace).toMatchObject({
				animal: '鼠',
				votes: 5,
				rank: 1
			});
			expect(submitted.votingResult.secondPlace).toMatchObject({
				animal: '牛',
				votes: 3,
				rank: 2,
				isGenuine: false
			});

			const [hostStatus, playerStatus] = await Promise.all([
				fetch(`${endpoint}/round-status`, {
					headers: { Authorization: `Bearer ${testUsers[0].token}` }
				}).then((response) => response.json()),
				fetch(`${endpoint}/round-status`, {
					headers: { Authorization: `Bearer ${testUsers[1].token}` }
				}).then((response) => response.json())
			]);

			expect(hostStatus.votingResult).toEqual(submitted.votingResult);
			expect(playerStatus.votingResult).toEqual(submitted.votingResult);
		});

		it('並行提交只保存第一個完成的權威結果', async () => {
			const room = await createVotingGame();
			const endpoint = `${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`;
			const votes = Object.fromEntries(
				room.artifacts.map((artifact, index) => [artifact.id, index + 1])
			);
			const request = () =>
				fetch(`${endpoint}/submit-votes`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ votes })
				});

			const responses = await Promise.all([request(), request()]);
			expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);

			const successfulResult = await responses.find((response) => response.status === 200)!.json();
			const persistedStatus = await fetch(`${endpoint}/round-status`, {
				headers: { Authorization: `Bearer ${testUsers[0].token}` }
			}).then((response) => response.json());

			expect(persistedStatus.votingResult).toEqual(successfulResult.votingResult);
		});
	});

	describe('POST /api/room/[name]/complete-voting', () => {
		it('應該拒絕未認證的請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/complete-voting`,
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
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/complete-voting`,
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
});
