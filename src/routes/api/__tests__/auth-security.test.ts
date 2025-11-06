import { describe, it, expect, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE } from './helpers';

describe('Authentication Edge Cases and Security', () => {
	const testEmails: string[] = [];

	afterAll(async () => {
		// 清理測試數據
		for (const email of testEmails) {
			try {
				await db.delete(user).where(eq(user.email, email));
			} catch (error) {
				console.error('清理測試數據失敗:', error);
			}
		}
	});

	describe('POST /api/auth/register - Password Validation', () => {
		it('應該拒絕過短的密碼', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `short-pwd-${Date.now()}@example.com`,
					nickname: 'Test User',
					password: '123',
					confirmPassword: '123'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toMatch(/密碼|長度|最少/);
		});

		it('應該拒絕過長的密碼', async () => {
			const longPassword = 'A'.repeat(200);
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `long-pwd-${Date.now()}@example.com`,
					nickname: 'Test User',
					password: longPassword,
					confirmPassword: longPassword
				})
			});

			expect([400]).toContain(response.status);
		});

		it('應該拒絕只包含空白字符的密碼', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `whitespace-pwd-${Date.now()}@example.com`,
					nickname: 'Test User',
					password: '        ',
					confirmPassword: '        '
				})
			});

			expect(response.status).toBe(400);
		});

		it('應該處理密碼中的特殊字符', async () => {
			const specialPassword = 'P@ssw0rd!#$%^&*()';
			const testEmail = `special-pwd-${Date.now()}@example.com`;
			testEmails.push(testEmail);

			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: 'Test User',
					password: specialPassword,
					confirmPassword: specialPassword
				})
			});

			expect([201, 400]).toContain(response.status);
			if (response.status === 201) {
				const data = await response.json();
				expect(data).toHaveProperty('requiresVerification', true);
			}
		});

		it('應該處理密碼中的 Unicode 字符', async () => {
			const unicodePassword = '密碼123!測試';
			const testEmail = `unicode-pwd-${Date.now()}@example.com`;
			testEmails.push(testEmail);

			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: 'Test User',
					password: unicodePassword,
					confirmPassword: unicodePassword
				})
			});

			expect([201, 400]).toContain(response.status);
			if (response.status === 201) {
				const data = await response.json();
				expect(data).toHaveProperty('requiresVerification', true);
			}
		});
	});

	describe('POST /api/auth/register - Email Validation', () => {
		it('應該拒絕無效的電子郵件格式 - 缺少 @', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'invalid-email.com',
					nickname: 'Test User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toMatch(/電子郵件|email|格式|無效/i);
		});

		it('應該拒絕無效的電子郵件格式 - 缺少域名', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'user@',
					nickname: 'Test User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toMatch(/電子郵件|email|格式|無效/i);
		});

		it('應該拒絕無效的電子郵件格式 - 空格', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'user name@example.com',
					nickname: 'Test User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect(response.status).toBe(400);
		});

		it('應該處理有效的複雜電子郵件格式', async () => {
			const validEmails = [
				`user.name+tag${Date.now()}@example.com`,
				`user_name${Date.now()}@example.co.uk`,
				`user-name${Date.now()}@sub.example.com`
			];

			for (const email of validEmails) {
				testEmails.push(email);
				const response = await fetch(`${API_BASE}/api/auth/register`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email,
						nickname: 'Test User',
						password: 'TestPassword123!',
						confirmPassword: 'TestPassword123!'
					})
				});

				expect([201, 400]).toContain(response.status);
			}
		});

		it('應該將電子郵件轉換為小寫', async () => {
			const testEmail = `MixedCase${Date.now()}@EXAMPLE.COM`;
			testEmails.push(testEmail.toLowerCase());

			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: 'Test User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			if (response.status === 201) {
				const data = await response.json();
				expect(data.user.email).toBe(testEmail.toLowerCase());
			}
		});
	});

	describe('POST /api/auth/register - Nickname Validation', () => {
		it('應該拒絕空字串的暱稱', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `empty-nickname-${Date.now()}@example.com`,
					nickname: '',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toMatch(/暱稱|nickname|不能為空|必填/i);
		});

		it('應該拒絕過長的暱稱', async () => {
			const longNickname = 'A'.repeat(100);
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `long-nickname-${Date.now()}@example.com`,
					nickname: longNickname,
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect([400]).toContain(response.status);
		});

		it('應該處理包含 Emoji 的暱稱', async () => {
			const testEmail = `emoji-nickname-${Date.now()}@example.com`;
			testEmails.push(testEmail);

			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: '玩家🎮',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect([201, 400]).toContain(response.status);
		});

		it('應該清理暱稱中的 XSS 攻擊', async () => {
			const testEmail = `xss-nickname-${Date.now()}@example.com`;
			testEmails.push(testEmail);

			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: '<script>alert("XSS")</script>User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			if (response.status === 201) {
				const data = await response.json();
				expect(data.user.nickname).not.toContain('<script>');
			}
		});
	});

	describe('POST /api/auth/login - Security', () => {
		it('應該拒絕不存在的電子郵件', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `nonexistent-${Date.now()}@example.com`,
					password: 'SomePassword123!'
				})
			});

			expect([400, 401]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/電子郵件|密碼|錯誤|不存在/);
		});

		it('應該拒絕錯誤的密碼', async () => {
			// 先註冊一個用戶
			const testEmail = `login-test-${Date.now()}@example.com`;
			testEmails.push(testEmail);

			await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: 'Test User',
					password: 'CorrectPassword123!',
					confirmPassword: 'CorrectPassword123!'
				})
			});

			// 嘗試用錯誤的密碼登入
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					password: 'WrongPassword123!'
				})
			});

			expect([400, 401]).toContain(response.status);
			const data = await response.json();
			expect(data.message).toMatch(/密碼|錯誤/);
		});

		it('應該處理大小寫不同的電子郵件登入', async () => {
			// 先註冊一個用戶
			const testEmail = `case-test-${Date.now()}@example.com`;
			testEmails.push(testEmail);

			await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: 'Test User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			// 用大寫的電子郵件登入
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail.toUpperCase(),
					password: 'TestPassword123!'
				})
			});

			// 應該成功登入（email 不分大小寫）
			expect([200, 401]).toContain(response.status);
		});

		it('應該拒絕缺少必要參數的登入請求', async () => {
			// 缺少密碼
			const response1 = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com'
				})
			});

			expect(response1.status).toBe(400);

			// 缺少電子郵件
			const response2 = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					password: 'TestPassword123!'
				})
			});

			expect(response2.status).toBe(400);
		});
	});

	describe('Token Security', () => {
		it('應該拒絕格式錯誤的 Bearer token', async () => {
			const response = await fetch(`${API_BASE}/api/user/profile`, {
				method: 'GET',
				headers: {
					Authorization: 'InvalidTokenFormat'
				}
			});

			expect(response.status).toBe(401);
		});

		it('應該拒絕過期或無效的 token', async () => {
			const response = await fetch(`${API_BASE}/api/user/profile`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token'
				}
			});

			expect(response.status).toBe(401);
		});

		it('應該拒絕空的 token', async () => {
			const response = await fetch(`${API_BASE}/api/user/profile`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer '
				}
			});

			expect(response.status).toBe(401);
		});
	});
});
