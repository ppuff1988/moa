import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, passwordResetToken } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$lib/server/password';

describe('Forgot Password API', () => {
	let testUserId: number;
	const testEmail = 'forgot-password-test@example.com';
	const testPassword = 'testpass123';

	beforeAll(async () => {
		// 建立測試用戶
		const hashedPassword = await hashPassword(testPassword);
		const result = await db
			.insert(user)
			.values({
				email: testEmail,
				nickname: 'Forgot Password Test User',
				passwordHash: hashedPassword
			})
			.returning();

		testUserId = result[0].id;
	});

	afterAll(async () => {
		// 清理測試數據
		await db.delete(passwordResetToken).where(eq(passwordResetToken.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	describe('POST /api/auth/forgot-password', () => {
		it('應該為已註冊的 Email 發送重置郵件', async () => {
			const response = await fetch('http://localhost:5173/api/auth/forgot-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email: testEmail })
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.message).toContain('郵件已發送');

			// 檢查資料庫中是否建立了 token
			const tokens = await db
				.select()
				.from(passwordResetToken)
				.where(eq(passwordResetToken.userId, testUserId))
				.orderBy(passwordResetToken.createdAt);

			expect(tokens.length).toBeGreaterThan(0);
			expect(tokens[tokens.length - 1].token).toBeTruthy();
			expect(tokens[tokens.length - 1].expiresAt).toBeInstanceOf(Date);
		});

		it('應該為不存在的 Email 返回成功（安全考量）', async () => {
			const response = await fetch('http://localhost:5173/api/auth/forgot-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email: 'nonexistent@example.com' })
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.message).toContain('已註冊');
		});

		it('應該拒絕空的 Email', async () => {
			const response = await fetch('http://localhost:5173/api/auth/forgot-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email: '' })
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('Email');
		});

		it('應該拒絕 OAuth 用戶重置密碼', async () => {
			// 建立 OAuth 用戶
			const oauthUser = await db
				.insert(user)
				.values({
					email: 'oauth-test@example.com',
					nickname: 'OAuth Test User',
					passwordHash: null
				})
				.returning();

			const response = await fetch('http://localhost:5173/api/auth/forgot-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email: 'oauth-test@example.com' })
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('第三方登入');

			// 清理
			await db.delete(user).where(eq(user.id, oauthUser[0].id));
		});
	});

	describe('POST /api/auth/reset-password', () => {
		let validToken: string;

		beforeAll(async () => {
			// 建立有效的重置 token
			const token = 'test-reset-token-' + Date.now();
			const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 小時後

			await db.insert(passwordResetToken).values({
				userId: testUserId,
				token,
				expiresAt
			});

			validToken = token;
		});

		it('應該成功重置密碼', async () => {
			const newPassword = 'newpassword123';

			const response = await fetch('http://localhost:5173/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					token: validToken,
					password: newPassword
				})
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.message).toContain('成功');

			// 檢查 token 是否被標記為已使用
			const tokens = await db
				.select()
				.from(passwordResetToken)
				.where(eq(passwordResetToken.token, validToken));

			expect(tokens[0].usedAt).toBeInstanceOf(Date);

			// 驗證新密碼可以登入
			const loginResponse = await fetch('http://localhost:5173/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email: testEmail,
					password: newPassword
				})
			});

			expect(loginResponse.status).toBe(200);
		});

		it('應該拒絕無效的 token', async () => {
			const response = await fetch('http://localhost:5173/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					token: 'invalid-token',
					password: 'newpassword123'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('無效');
		});

		it('應該拒絕已使用的 token', async () => {
			const response = await fetch('http://localhost:5173/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					token: validToken,
					password: 'anotherpassword123'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('無效');
		});

		it('應該拒絕過期的 token', async () => {
			// 建立過期的 token
			const expiredToken = 'expired-token-' + Date.now();
			const expiredAt = new Date(Date.now() - 1000); // 已過期

			await db.insert(passwordResetToken).values({
				userId: testUserId,
				token: expiredToken,
				expiresAt: expiredAt
			});

			const response = await fetch('http://localhost:5173/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					token: expiredToken,
					password: 'newpassword123'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('過期');
		});

		it('應該拒絕過短的密碼', async () => {
			// 建立新的有效 token
			const token = 'test-token-short-pass-' + Date.now();
			await db.insert(passwordResetToken).values({
				userId: testUserId,
				token,
				expiresAt: new Date(Date.now() + 60 * 60 * 1000)
			});

			const response = await fetch('http://localhost:5173/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					token,
					password: '123'
				})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toContain('6');
		});
	});
});
