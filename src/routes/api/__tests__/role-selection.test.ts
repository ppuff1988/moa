import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers, roles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser } from './helpers';

describe('Role Selection and Lock API', () => {
	const testUsers: { email: string; token: string; userId: number }[] = [];
	const testGames: string[] = [];
	let allRoles: Array<{ id: number; name: string; camp: string }> = [];

	beforeAll(async () => {
		// 創建 6 個測試用戶
		for (let i = 0; i < 6; i++) {
			const userData = await createTestUser(`-role-${i}`);
			testUsers.push({
				email: userData.email,
				token: userData.token,
				userId: userData.userId
			});
		}

		// 獲取所有角色
		allRoles = await db.select().from(roles);
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

	describe('POST /api/room/[name]/lock-role', () => {
		let testRoomName: string;

		beforeAll(async () => {
			// 創建測試房間
			const createResponse = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: 'role123'
				})
			});

			const createData = await createResponse.json();
			testRoomName = createData.roomName; // 使用自動生成的房間名稱
			testGames.push(createData.gameId);
		});

		it('應該拒絕在等待階段鎖定角色', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/lock-role`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						roleId: allRoles[0]?.id || 1
					})
				}
			);

			// 應該拒絕，因為遊戲尚未進入選角階段
			expect([400, 404]).toContain(response.status);
		});

		it('應該拒絕未認證的請求', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/lock-role`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						roleId: 1
					})
				}
			);

			expect(response.status).toBe(401);
		});

		it('應該拒絕無效的角色 ID', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/lock-role`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						roleId: 99999
					})
				}
			);

			expect([400, 404]).toContain(response.status);
		});

		it('應該拒絕缺少角色 ID', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/lock-role`,
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
	});

	describe('POST /api/room/[name]/unlock-role', () => {
		let testRoomName: string;

		beforeAll(async () => {
			const createResponse = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: 'unlock123'
				})
			});

			const createData = await createResponse.json();
			testRoomName = createData.roomName; // 使用自動生成的房間名稱
			testGames.push(createData.gameId);
		});

		it('應該拒絕在等待階段解鎖角色', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/unlock-role`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUsers[0].token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			expect([400, 404]).toContain(response.status);
		});

		it('應該拒絕未認證的請求', async () => {
			const response = await fetch(
				`${API_BASE}/api/room/${encodeURIComponent(testRoomName)}/unlock-role`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);

			expect(response.status).toBe(401);
		});
	});

	describe('GET /api/roles', () => {
		it('應該成功獲取所有角色', async () => {
			const response = await fetch(`${API_BASE}/api/roles`, {
				headers: {
					Authorization: `Bearer ${testUsers[0].token}`
				}
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('roles');
			expect(Array.isArray(data.roles)).toBe(true);
			expect(data.roles.length).toBeGreaterThan(0);

			// 驗證角色結構
			if (data.roles.length > 0) {
				const role = data.roles[0];
				expect(role).toHaveProperty('id');
				expect(role).toHaveProperty('name');
				expect(role).toHaveProperty('camp');
			}
		});

		it('應該允許未認證用戶獲取角色列表', async () => {
			// 角色列表是公開的，不需要認證
			const response = await fetch(`${API_BASE}/api/roles`);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('roles');
		});
	});

	describe('Verify role selection constraints', () => {
		it('應該確保每個遊戲的角色配置正確', async () => {
			// 這個測試確認系統的角色配置邏輯
			const allRolesFromDb = await db.select().from(roles);

			// 應該有好人和壞人角色
			const goodRoles = allRolesFromDb.filter((r: { camp: string }) => r.camp === 'good');
			const badRoles = allRolesFromDb.filter((r: { camp: string }) => r.camp === 'bad');

			expect(goodRoles.length).toBeGreaterThan(0);
			expect(badRoles.length).toBeGreaterThan(0);
		});
	});
});
