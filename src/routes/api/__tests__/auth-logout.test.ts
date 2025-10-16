import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser } from './helpers';

describe('Auth Logout API', () => {
	let testUser: { email: string; token: string; userId: number };

	beforeAll(async () => {
		testUser = await createTestUser('-logout');
	});

	afterAll(async () => {
		// 清理測試數據
		try {
			await db.delete(user).where(eq(user.email, testUser.email));
		} catch (error) {
			console.error('清理測試數據失敗:', error);
		}
	});

	describe('POST /api/auth/logout', () => {
		it('應該成功登出', async () => {
			const response = await fetch(`${API_BASE}/api/auth/logout`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${testUser.token}`,
					'Content-Type': 'application/json'
				}
			});

			expect([200, 204]).toContain(response.status);
		});

		it('應該接受未認證的登出請求', async () => {
			const response = await fetch(`${API_BASE}/api/auth/logout`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			// 登出通常即使沒有 token 也應該成功（冪等性）
			expect([200, 204, 401]).toContain(response.status);
		});

		it('應該接受無效 token 的登出請求', async () => {
			const response = await fetch(`${API_BASE}/api/auth/logout`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json'
				}
			});

			expect([200, 204, 401]).toContain(response.status);
		});
	});
});
