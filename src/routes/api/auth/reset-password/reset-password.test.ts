import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	dbMock,
	txDeleteMock,
	txDeleteWhereMock,
	txUpdateMock,
	userUpdateValuesMock,
	legacyUpdateMock,
	legacySelectMock
} = vi.hoisted(() => ({
	dbMock: {
		select: vi.fn(),
		update: vi.fn(),
		transaction: vi.fn()
	},
	txDeleteMock: vi.fn(),
	txDeleteWhereMock: vi.fn().mockResolvedValue(undefined),
	txUpdateMock: vi.fn(),
	userUpdateValuesMock: vi.fn(),
	legacyUpdateMock: vi.fn().mockResolvedValue(undefined),
	legacySelectMock: vi.fn().mockResolvedValue([{ id: 11, userId: 7 }])
}));

vi.mock('$lib/server/db', () => ({ db: dbMock }));
vi.mock('$lib/server/password', () => ({
	hashPassword: vi.fn().mockResolvedValue('hashed-password')
}));

import { passwordResetToken, session, user } from '$lib/server/db/schema';
import { POST } from './+server';

function createResetRequest(password: string) {
	return {
		request: new Request('http://localhost/api/auth/reset-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: 'single-use-token', password })
		})
	} as Parameters<typeof POST>[0];
}

describe('POST /api/auth/reset-password', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		let tokenAvailable = true;

		dbMock.select.mockReturnValue({
			from: () => ({
				where: () => ({ limit: legacySelectMock })
			})
		});
		dbMock.update.mockReturnValue({
			set: () => ({ where: legacyUpdateMock })
		});

		txUpdateMock.mockImplementation((table) => {
			if (table === passwordResetToken) {
				return {
					set: () => ({
						where: () => ({
							returning: async () => {
								if (!tokenAvailable) return [];
								tokenAvailable = false;
								return [{ userId: 7 }];
							}
						})
					})
				};
			}

			expect(table).toBe(user);
			return {
				set: (values: unknown) => {
					userUpdateValuesMock(values);
					return { where: vi.fn().mockResolvedValue(undefined) };
				}
			};
		});

		txDeleteMock.mockImplementation((table) => {
			expect(table).toBe(session);
			return { where: txDeleteWhereMock };
		});

		dbMock.transaction.mockImplementation(async (callback) =>
			callback({ update: txUpdateMock, delete: txDeleteMock })
		);
	});

	it('原子消耗 token，並只為成功的重設撤銷既有 sessions', async () => {
		const responses = await Promise.all([
			POST(createResetRequest('first-password')),
			POST(createResetRequest('second-password'))
		]);

		expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
		expect(dbMock.transaction).toHaveBeenCalledTimes(2);
		expect(txDeleteMock).toHaveBeenCalledTimes(1);
		expect(txDeleteWhereMock).toHaveBeenCalledTimes(1);
		expect(userUpdateValuesMock).toHaveBeenCalledWith(
			expect.objectContaining({ tokenVersion: expect.anything() })
		);
	});
});
