/**
 * 登入/註冊頁面伺服器端重定向測試
 *
 * 涵蓋修改內容：
 * - src/routes/auth/login/+page.server.ts：已登入用戶訪問登入頁時重定向到首頁
 * - src/routes/auth/register/+page.server.ts：已登入用戶訪問註冊頁時重定向到首頁
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE, createTestUser } from './helpers';

/**
 * 從登入回應中提取 Lucia session cookie 字串
 */
async function getSessionCookie(email: string, password: string): Promise<string | null> {
	const response = await fetch(`${API_BASE}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});

	if (!response.ok) return null;

	const setCookieHeader = response.headers.get('set-cookie');
	if (!setCookieHeader) return null;

	const match = setCookieHeader.match(/auth_session=([^;]+)/);
	if (!match) return null;

	return `auth_session=${match[1]}`;
}

describe('已登入用戶頁面重定向', () => {
	let testUser: { email: string; password: string; token: string; userId: number };

	beforeAll(async () => {
		testUser = await createTestUser('-page-redirect');
	});

	afterAll(async () => {
		try {
			await db.delete(user).where(eq(user.email, testUser.email));
		} catch (error) {
			console.error('清理測試數據失敗:', error);
		}
	});

	describe('GET /auth/login - 已登入用戶應重定向到首頁', () => {
		it('未登入用戶可以正常訪問登入頁（不重定向）', async () => {
			const response = await fetch(`${API_BASE}/auth/login`, {
				redirect: 'manual'
			});

			// 未登入應返回 200（登入頁本身）
			expect(response.status).toBe(200);
		});

		it('持有有效 session cookie 的用戶訪問登入頁應被重定向到首頁', async () => {
			const sessionCookie = await getSessionCookie(testUser.email, testUser.password);
			expect(sessionCookie).not.toBeNull();

			const response = await fetch(`${API_BASE}/auth/login`, {
				headers: { Cookie: sessionCookie! },
				redirect: 'manual'
			});

			// 應返回 302 重定向
			expect(response.status).toBe(302);

			// 重定向目標應為首頁
			const location = response.headers.get('location');
			expect(location).toBe('/');
		});

		it('持有無效 session cookie 的用戶訪問登入頁不應重定向', async () => {
			const response = await fetch(`${API_BASE}/auth/login`, {
				headers: { Cookie: 'auth_session=invalid-session-id' },
				redirect: 'manual'
			});

			// 無效 session 應返回 200（登入頁本身）
			expect(response.status).toBe(200);
		});
	});

	describe('GET /auth/register - 已登入用戶應重定向到首頁', () => {
		it('未登入用戶可以正常訪問註冊頁（不重定向）', async () => {
			const response = await fetch(`${API_BASE}/auth/register`, {
				redirect: 'manual'
			});

			// 未登入應返回 200（註冊頁本身）
			expect(response.status).toBe(200);
		});

		it('持有有效 session cookie 的用戶訪問註冊頁應被重定向到首頁', async () => {
			const sessionCookie = await getSessionCookie(testUser.email, testUser.password);
			expect(sessionCookie).not.toBeNull();

			const response = await fetch(`${API_BASE}/auth/register`, {
				headers: { Cookie: sessionCookie! },
				redirect: 'manual'
			});

			// 應返回 302 重定向
			expect(response.status).toBe(302);

			// 重定向目標應為首頁
			const location = response.headers.get('location');
			expect(location).toBe('/');
		});
	});
});
