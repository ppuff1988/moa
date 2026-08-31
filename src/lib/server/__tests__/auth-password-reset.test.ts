import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, jwtPayload, databaseUser } = vi.hoisted(() => ({
	dbMock: { select: vi.fn() },
	jwtPayload: { userId: 7, email: 'user@example.com', iat: 100, tokenVersion: 0 },
	databaseUser: {
		id: 7,
		email: 'user@example.com',
		tokenVersion: 1
	}
}));

vi.mock('$env/dynamic/private', () => ({
	env: { JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '30d' }
}));
vi.mock('../db', () => ({ db: dbMock }));
vi.mock('jsonwebtoken', () => ({
	default: {
		verify: vi.fn(() => jwtPayload),
		sign: vi.fn(() => 'signed-token')
	}
}));

import { getUserFromJWT } from '../auth';

describe('getUserFromJWT', () => {
	beforeEach(() => {
		jwtPayload.iat = 100;
		jwtPayload.tokenVersion = 0;
		dbMock.select.mockReturnValue({
			from: () => ({
				where: () => ({
					limit: vi.fn().mockResolvedValue([databaseUser])
				})
			})
		});
	});

	it('拒絕密碼重設前簽發的舊版本 JWT', async () => {
		await expect(getUserFromJWT('old-token')).resolves.toBeNull();
	});

	it('接受密碼重設後同一秒簽發的新版本 JWT', async () => {
		jwtPayload.iat = 101;
		jwtPayload.tokenVersion = 1;

		await expect(getUserFromJWT('new-token')).resolves.toBe(databaseUser);
	});
});
