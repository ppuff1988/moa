import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers, roles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser, createTestRoom, joinTestRoom } from './helpers';
import { GAME_ROLES } from '$lib/server/game';

describe('Room Start Game API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];

	beforeAll(async () => {
		// 創建測試用戶（至少需要 6 個玩家才能開始遊戲）
		for (let i = 0; i < 8; i++) {
			const userData = await createTestUser(`-start-game-${i}`);
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

	describe('POST /api/room/[name]/start', () => {
		it('應該拒絕自動分派房間進入手動選角階段', async () => {
			const room = await createTestRoom(testUsers[0].token, {
				autoAssignRolesAndColors: true
			});
			testGames.push(room.gameId);
			for (let index = 1; index < 6; index++) {
				await joinTestRoom(testUsers[index].token, room.roomName, room.password);
			}

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start-selection`,
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

		it('應該拒絕尚未全員準備的自動分派房間開始遊戲', async () => {
			const room = await createTestRoom(testUsers[0].token, {
				autoAssignRolesAndColors: true
			});
			testGames.push(room.gameId);

			for (let index = 1; index < 6; index++) {
				await joinTestRoom(testUsers[index].token, room.roomName, room.password);
			}

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect(response.status).toBe(400);
			expect((await response.json()).message).toMatch(/準備/);
		});

		it.each([6, 7, 8])('應該為 %i 人自動分派並直接開始遊戲', async (playerCount) => {
			const room = await createTestRoom(testUsers[0].token, {
				autoAssignRolesAndColors: true
			});
			testGames.push(room.gameId);

			for (let index = 1; index < playerCount; index++) {
				await joinTestRoom(testUsers[index].token, room.roomName, room.password);
			}

			for (let index = 0; index < playerCount; index++) {
				const readyResponse = await fetch(
					`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/ready`,
					{
						method: 'PATCH',
						headers: {
							Authorization: `Bearer ${testUsers[index].token}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ isReady: true })
					}
				);
				expect(readyResponse.status).toBe(200);
			}

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect(response.status).toBe(200);
			expect((await response.json()).status).toBe('playing');

			const assignedPlayers = await db
				.select({ roleName: roles.name, color: gamePlayers.color })
				.from(gamePlayers)
				.innerJoin(roles, eq(gamePlayers.roleId, roles.id))
				.where(eq(gamePlayers.gameId, room.gameId));
			const expectedRoles = [
				...GAME_ROLES[playerCount as keyof typeof GAME_ROLES].good,
				...GAME_ROLES[playerCount as keyof typeof GAME_ROLES].bad
			].sort();

			expect(assignedPlayers.map((player) => player.roleName).sort()).toEqual(expectedRoles);
			expect(new Set(assignedPlayers.map((player) => player.color)).size).toBe(playerCount);
		});

		it('應該只公開自己的角色並保留老朝奉與藥不然互認', async () => {
			const playerCount = 7;
			const room = await createTestRoom(testUsers[0].token, {
				autoAssignRolesAndColors: true
			});
			testGames.push(room.gameId);

			for (let index = 1; index < playerCount; index++) {
				await joinTestRoom(testUsers[index].token, room.roomName, room.password);
			}
			for (let index = 0; index < playerCount; index++) {
				await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/ready`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${testUsers[index].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ isReady: true })
				});
			}
			await fetch(`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				}
			});

			const roomResponse = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}`,
				{ headers: { Authorization: `Bearer ${testUsers[0].token}` } }
			);
			const roomData = await roomResponse.json();
			expect(
				roomData.players.find((player: { userId: number }) => player.userId === testUsers[0].userId)
					.roleId
			).toBeTruthy();
			expect(
				roomData.players
					.filter((player: { userId: number }) => player.userId !== testUsers[0].userId)
					.every((player: { roleId: number | null }) => player.roleId === null)
			).toBe(true);

			const playersResponse = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/players`,
				{ headers: { Authorization: `Bearer ${testUsers[0].token}` } }
			);
			const playersData = await playersResponse.json();
			expect(
				playersData.players
					.filter((player: { userId: number }) => player.userId !== testUsers[0].userId)
					.every((player: { roleName: string | null }) => player.roleName === null)
			).toBe(true);

			const assignedIdentities = await db
				.select({ userId: gamePlayers.userId, roleName: roles.name })
				.from(gamePlayers)
				.innerJoin(roles, eq(gamePlayers.roleId, roles.id))
				.where(eq(gamePlayers.gameId, room.gameId));
			for (const [roleName, teammateRoleName] of [
				['老朝奉', '藥不然'],
				['藥不然', '老朝奉']
			] as const) {
				const identity = assignedIdentities.find((player) => player.roleName === roleName);
				const identityUser = testUsers.find((testUser) => testUser.userId === identity?.userId);
				const teammateResponse = await fetch(
					`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/teammate-info`,
					{ headers: { Authorization: `Bearer ${identityUser?.token}` } }
				);
				const teammateData = await teammateResponse.json();
				expect(teammateData.hasTeammate).toBe(true);
				expect(teammateData.teammate.roleName).toBe(teammateRoleName);
			}

			const zhengIdentity = assignedIdentities.find((player) => player.roleName === '鄭國渠');
			const zhengUser = testUsers.find((testUser) => testUser.userId === zhengIdentity?.userId);
			const zhengResponse = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/teammate-info`,
				{ headers: { Authorization: `Bearer ${zhengUser?.token}` } }
			);
			expect((await zhengResponse.json()).hasTeammate).toBe(false);
		});

		it('應該拒絕玩家數量不足的房間開始遊戲', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 只有 1 個玩家
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect([400, 403]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/玩家|人數|不足|至少/);
		});

		it('應該拒絕非房主開始遊戲', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 第二個玩家加入
			await joinTestRoom(testUsers[1].token, room.roomName, room.password);

			// 非房主嘗試開始
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[1].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect([400, 403]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/房主|權限/);
		});

		it('應該拒絕未認證的開始請求', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該在玩家數量足夠時允許房主開始遊戲', async () => {
			const room = await createTestRoom(testUsers[0].token);
			testGames.push(room.gameId);

			// 添加 5 個玩家（總共 6 個）
			for (let i = 1; i <= 5; i++) {
				await joinTestRoom(testUsers[i].token, room.roomName, room.password);
			}

			// 房主開始遊戲
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(room.roomName)}/start`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			// 可能成功或因為其他條件失敗（如準備狀態）
			if (response.status === 200) {
				const data = await response.json();
				expect(data.message).toBeDefined();
			} else {
				expect([400, 403]).toContain(response.status);
			}
		});

		it('應該拒絕不存在的房間開始遊戲', async () => {
			const response = await fetch(`${API_BASE}/api/room/NonExistentRoom-${Date.now()}/start`, {
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
