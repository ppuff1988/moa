import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser } from './helpers';

describe('User Profile API', () => {
	let testUser: { email: string; token: string; userId: number };

	beforeAll(async () => {
		testUser = await createTestUser('-profile');
	});

	afterAll(async () => {
		// 清理測試數據
		try {
			await db.delete(user).where(eq(user.email, testUser.email));
		} catch (error) {
			console.error('清理測試數據失敗:', error);
		}
	});

	describe('GET /api/user/profile', () => {
		it('應該成功獲取已認證用戶的個人資料', async () => {
			const response = await fetch(`${API_BASE}/api/user/profile`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${testUser.token}`
				}
			});

			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty('id', testUser.userId);
			expect(data).toHaveProperty('email', testUser.email);
			expect(data).toHaveProperty('nickname');
			expect(data).not.toHaveProperty('passwordHash');
		});

		it('應該拒絕未認證的請求', async () => {
			const response = await fetch(`${API_BASE}/api/user/profile`, {
				method: 'GET'
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.message).toContain('未授權');
		});

		it('應該拒絕無效的 token', async () => {
			const response = await fetch(`${API_BASE}/api/user/profile`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer invalid-token-123'
				}
			});

			expect(response.status).toBe(401);
		});

		it('應該拒絕暱稱中的 XSS 攻擊字串', async () => {
			// 嘗試創建一個帶有 XSS 攻擊的用戶（應該被拒絕）
			const xssEmail = `xss-test-${Date.now()}@example.com`;
			const xssNickname = '<script>alert("XSS")</script>Test User';

			const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: xssEmail,
					nickname: xssNickname,
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			// 註冊應該被拒絕（因為 XSS 驗證）
			expect(registerResponse.status).toBe(400);
			const registerData = await registerResponse.json();
			expect(registerData.message).toMatch(/暱稱|不允許|內容/);
		});
	});
});
