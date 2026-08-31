import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { envMock, signMock } = vi.hoisted(() => ({
	envMock: { JWT_SECRET: undefined as string | undefined, JWT_EXPIRES_IN: '30d' },
	signMock: vi.fn(() => 'signed-token')
}));

vi.mock('$env/dynamic/private', () => ({ env: envMock }));
vi.mock('../db', () => ({ db: { select: vi.fn() } }));
vi.mock('jsonwebtoken', () => ({
	default: {
		sign: signMock,
		verify: vi.fn()
	}
}));

import { generateJWT } from '../auth';

describe('production JWT secret validation', () => {
	const originalNodeEnv = process.env.NODE_ENV;
	const originalJwtSecret = process.env.JWT_SECRET;

	beforeEach(() => {
		process.env.NODE_ENV = 'production';
		delete process.env.JWT_SECRET;
		envMock.JWT_SECRET = undefined;
		signMock.mockClear();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
		if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
		else process.env.JWT_SECRET = originalJwtSecret;
	});

	it.each([
		['缺少', undefined],
		['過短', 'short-secret'],
		['使用範例值', 'your-super-secret-jwt-key-change-this-in-production']
	])('production %s JWT_SECRET 時拒絕簽發 token', (_label, jwtSecret) => {
		envMock.JWT_SECRET = jwtSecret;

		expect(() => generateJWT({ userId: 1, email: 'user@example.com' })).toThrow(/JWT_SECRET/);
		expect(signMock).not.toHaveBeenCalled();
	});

	it('production 使用至少 32 字元的非範例 secret 簽發 token', () => {
		envMock.JWT_SECRET = 'a-secure-production-secret-with-32-chars';

		expect(generateJWT({ userId: 1, email: 'user@example.com' })).toBe('signed-token');
		expect(signMock).toHaveBeenCalledWith(
			{ userId: 1, email: 'user@example.com' },
			envMock.JWT_SECRET,
			{ expiresIn: '30d' }
		);
	});
});
