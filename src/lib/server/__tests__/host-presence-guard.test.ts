import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gamePlayers, games } from '../db/schema';

const { dbMock, getUserFromJWTMock } = vi.hoisted(() => ({
	dbMock: { select: vi.fn() },
	getUserFromJWTMock: vi.fn()
}));

vi.mock('../db', () => ({ db: dbMock }));
vi.mock('../auth', () => ({
	verifyJWTWithError: vi.fn(() => ({ payload: { userId: 7, email: 'host@example.com' } })),
	getUserFromJWT: getUserFromJWTMock
}));
vi.mock('../lucia', () => ({
	lucia: { sessionCookieName: 'auth_session', validateSession: vi.fn() }
}));

import { verifyHostPermission, verifyHostWithStatus } from '../api-helpers';

describe('房主房間資格 guard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getUserFromJWTMock.mockResolvedValue({
			id: 7,
			email: 'host@example.com',
			nickname: '房主'
		});

		dbMock.select.mockImplementation((selection?: Record<string, unknown>) => ({
			from: (table: unknown) => ({
				where: () => ({
					limit: async () => {
						if (table === games) {
							return [{ id: 'game-1', roomName: '123456', hostId: 7, status: 'playing' }];
						}
						if (table === gamePlayers && selection) return [];
						return [];
					}
				})
			})
		}));
	});

	it('已離開房間的房主不能通過帶狀態檢查的房主驗證', async () => {
		const result = await verifyHostWithStatus(
			new Request('http://localhost', { headers: { Authorization: 'Bearer token' } }),
			'123456',
			'playing'
		);

		expect(result).toHaveProperty('error');
		if ('error' in result) expect(result.error.status).toBe(403);
	});

	it('已離開房間的房主不能通過一般房主驗證', async () => {
		const result = await verifyHostPermission(
			new Request('http://localhost', { headers: { Authorization: 'Bearer token' } }),
			'123456'
		);

		expect(result).toHaveProperty('error');
		if ('error' in result) expect(result.error.status).toBe(403);
	});
});
