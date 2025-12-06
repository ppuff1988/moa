import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { API_BASE } from './helpers';

describe('Authentication API', () => {
	const testUsers: string[] = [];

	afterAll(async () => {
		// 清理測試數據
		for (const email of testUsers) {
			try {
				await db.delete(user).where(eq(user.email, email));
			} catch (error) {
				console.error('清理測試數據失敗:', error);
			}
		}
	});

	describe('POST /api/auth/register', () => {
		it('應該成功註冊新用戶並要求驗證 Email', async () => {
			const testEmail = `test-${Date.now()}@example.com`;
			testUsers.push(testEmail);

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

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data).toHaveProperty('requiresVerification', true);
			expect(data).toHaveProperty('user');
			expect(data.user.email).toBe(testEmail);
			expect(data.user.nickname).toBe('Test User');
			expect(data.message).toContain('驗證');
		});

		it('應該拒絕重複的電子郵件', async () => {
			const testEmail = `test-duplicate-${Date.now()}@example.com`;
			testUsers.push(testEmail);

			// 第一次註冊
			await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: 'First User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			// 第二次註冊相同 email
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: 'Second User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('已被使用');
		});

		it('應該拒絕密碼不匹配', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `test-mismatch-${Date.now()}@example.com`,
					nickname: 'Test User',
					password: 'TestPassword123!',
					confirmPassword: 'DifferentPassword'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('密碼不一致');
		});

		it('應該拒絕無效的電子郵件格式', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'invalid-email',
					nickname: 'Test User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('Email 格式');
		});

		it('應該拒絕包含危險字符的 Email', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test<script>@example.com',
					nickname: 'Test User',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('Email 格式');
		});

		it('應該拒絕過短的密碼', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `test-short-${Date.now()}@example.com`,
					nickname: 'Test User',
					password: '12345',
					confirmPassword: '12345'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('至少需要 6 個字元');
		});

		it('應該拒絕過短的暱稱', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `test-short-nickname-${Date.now()}@example.com`,
					nickname: 'A',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('暱稱至少需要 2 個字元');
		});

		it('應該拒絕缺少必填欄位', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `test-missing-${Date.now()}@example.com`,
					password: 'TestPassword123!'
					// 缺少 nickname
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('必填欄位');
		});
	});

	describe('POST /api/auth/login', () => {
		let testEmail: string;
		const testPassword = 'TestPassword123!';

		beforeAll(async () => {
			// 創建測試用戶並標記為已驗證
			testEmail = `test-login-${Date.now()}@example.com`;
			testUsers.push(testEmail);

			await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					nickname: 'Login Test User',
					password: testPassword,
					confirmPassword: testPassword
				})
			});

			// 直接在資料庫中標記為已驗證
			await db
				.update(user)
				.set({
					emailVerified: true,
					emailVerificationToken: null,
					emailVerificationTokenExpiresAt: null
				})
				.where(eq(user.email, testEmail));
		});

		it('應該成功登入已驗證的用戶', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					password: testPassword
				})
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty('token');
			expect(data).toHaveProperty('user');
			expect(data.user.email).toBe(testEmail);
			expect(data.message).toBe('登入成功');
		});

		it('應該拒絕未驗證的用戶登入', async () => {
			// 創建未驗證的用戶
			const unverifiedEmail = `test-unverified-${Date.now()}@example.com`;
			testUsers.push(unverifiedEmail);

			await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: unverifiedEmail,
					nickname: 'Unverified User',
					password: testPassword,
					confirmPassword: testPassword
				})
			});

			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: unverifiedEmail,
					password: testPassword
				})
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data.message).toContain('驗證');
			expect(data).toHaveProperty('requiresVerification', true);
		});

		it('應該拒絕錯誤的密碼', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail,
					password: 'WrongPassword'
				})
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.message).toContain('密碼錯誤');
		});

		it('應該拒絕不存在的用戶', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'nonexistent@example.com',
					password: testPassword
				})
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.message).toContain('密碼錯誤');
		});

		it('應該拒絕缺少 Email', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					password: testPassword
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('Email');
		});

		it('應該拒絕缺少密碼', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: testEmail
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('密碼');
		});
	});
});
