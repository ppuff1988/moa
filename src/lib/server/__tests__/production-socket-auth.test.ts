import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';

describe('production socket authentication', () => {
	it('沒有 JWT 時以有效的 Lucia auth_session cookie 驗證使用者', async () => {
		const authModule = await import('../../../../scripts/socket-auth.js').catch(() => null);

		expect(authModule).not.toBeNull();
		if (!authModule) return;

		const query = vi.fn().mockResolvedValue({ rows: [{ user_id: 7 }] });
		const authenticate = authModule.createSocketAuthenticator({
			pool: { query },
			jwtSecret: 'test-secret'
		});

		await expect(
			authenticate({
				token: undefined,
				cookieHeader: 'theme=dark; auth_session=google-session-id'
			})
		).resolves.toEqual({ userId: 7 });
		expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM sessions'), [
			'google-session-id'
		]);
	});

	it('保留 JWT token version 驗證', async () => {
		const authModule = await import('../../../../scripts/socket-auth.js').catch(() => null);

		expect(authModule).not.toBeNull();
		if (!authModule) return;

		const query = vi.fn().mockResolvedValue({ rows: [{ token_version: 2 }] });
		const authenticate = authModule.createSocketAuthenticator({
			pool: { query },
			jwtSecret: 'test-secret'
		});
		const token = jwt.sign(
			{ userId: 7, email: 'user@example.com', tokenVersion: 2 },
			'test-secret'
		);

		await expect(authenticate({ token, cookieHeader: '' })).resolves.toEqual({ userId: 7 });
	});
});
