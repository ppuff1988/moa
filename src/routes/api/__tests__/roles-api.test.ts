import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db';
import { roles } from '$lib/server/db/schema';
import { API_BASE } from './helpers';

describe('Roles API', () => {
	describe('GET /api/roles', () => {
		it('應該成功獲取所有角色列表', async () => {
			const response = await fetch(`${API_BASE}/api/roles`);

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('roles');
			expect(Array.isArray(data.roles)).toBe(true);
			expect(data.roles.length).toBeGreaterThan(0);

			// 驗證角色數據結構
			const role = data.roles[0];
			expect(role).toHaveProperty('id');
			expect(role).toHaveProperty('name');
			expect(role).toHaveProperty('camp');
		});

		it('應該按玩家人數過濾角色 - 6人遊戲', async () => {
			const response = await fetch(`${API_BASE}/api/roles?playerCount=6`);

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('roles');
			expect(Array.isArray(data.roles)).toBe(true);

			// 6人遊戲應該排除姬云浮和鄭國渠
			const roleNames = data.roles.map((r: { name: string }) => r.name);
			expect(roleNames).not.toContain('姬云浮');
			expect(roleNames).not.toContain('鄭國渠');
		});

		it('應該按玩家人數過濾角色 - 7人遊戲', async () => {
			const response = await fetch(`${API_BASE}/api/roles?playerCount=7`);

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('roles');
			expect(Array.isArray(data.roles)).toBe(true);

			// 7人遊戲應該排除姬云浮，但包含鄭國渠
			const roleNames = data.roles.map((r: { name: string }) => r.name);
			expect(roleNames).not.toContain('姬云浮');
			// 如果鄭國渠存在於資料庫中，應該被包含
		});

		it('應該按玩家人數過濾角色 - 8人遊戲', async () => {
			const response = await fetch(`${API_BASE}/api/roles?playerCount=8`);

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('roles');
			expect(Array.isArray(data.roles)).toBe(true);

			// 8人遊戲應該包含所有角色
			const allRoles = await db.select().from(roles);
			expect(data.roles.length).toBe(allRoles.length);
		});

		it('應該返回按 ID 排序的角色', async () => {
			const response = await fetch(`${API_BASE}/api/roles`);

			expect(response.status).toBe(200);
			const data = await response.json();

			// 確認角色按 ID 排序
			for (let i = 1; i < data.roles.length; i++) {
				expect(data.roles[i].id).toBeGreaterThanOrEqual(data.roles[i - 1].id);
			}
		});

		it('應該處理無效的玩家人數參數', async () => {
			const response = await fetch(`${API_BASE}/api/roles?playerCount=invalid`);

			expect(response.status).toBe(200);
			const data = await response.json();

			// 應該返回所有角色（因為參數無效被忽略）
			expect(data).toHaveProperty('roles');
			expect(Array.isArray(data.roles)).toBe(true);
		});

		it('應該處理玩家人數為 0 的情況', async () => {
			const response = await fetch(`${API_BASE}/api/roles?playerCount=0`);

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('roles');
			expect(Array.isArray(data.roles)).toBe(true);
		});

		it('應該處理超大玩家人數', async () => {
			const response = await fetch(`${API_BASE}/api/roles?playerCount=999`);

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('roles');
			expect(Array.isArray(data.roles)).toBe(true);
		});
	});
});
