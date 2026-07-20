import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers, gameArtifacts, gameRounds } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, joinTestRoom } from './helpers';

describe('Game Phase APIs - Discussion and Voting', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶
		for (let i = 0; i < 6; i++) {
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

	async function createVotingGame() {
		const room = await createTestRoom(testUsers[0].token);
		testGames.push(room.gameId);
		await joinTestRoom(testUsers[1].token, room.roomName, room.password);

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
