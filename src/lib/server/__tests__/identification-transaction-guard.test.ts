import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gamePlayers, gameRounds, games, roles } from '../db/schema';

const { dbMock, getUserFromJWTMock, lockRoundMock } = vi.hoisted(() => ({
	dbMock: { transaction: vi.fn() },
	getUserFromJWTMock: vi.fn(),
	lockRoundMock: vi.fn()
}));

vi.mock('../db', () => ({ db: dbMock }));
vi.mock('../auth', () => ({
	verifyJWTWithError: vi.fn(() => ({ payload: { userId: 7, email: 'user@example.com' } })),
	getUserFromJWT: getUserFromJWTMock
}));
vi.mock('../lucia', () => ({
	lucia: { sessionCookieName: 'auth_session', validateSession: vi.fn() }
}));

import * as apiHelpers from '../api-helpers';

type Guard = <T>(
	request: Request,
	roomName: string,
	action: (context: { transaction: unknown; player: { id: number } }) => Promise<T>
) => Promise<{ data: T } | { error: Response }>;

describe('identification transaction guard', () => {
	let phase = 'identification';

	beforeEach(() => {
		vi.clearAllMocks();
		phase = 'identification';
		getUserFromJWTMock.mockResolvedValue({ id: 7, email: 'user@example.com' });

		const rowsFor = (table: unknown) => {
			if (table === games) return [{ id: 'game-1', roomName: '123456', status: 'playing' }];
			if (table === gamePlayers) {
				return [{ id: 11, gameId: 'game-1', userId: 7, roleId: 3, leftAt: null }];
			}
			if (table === roles) return [{ id: 3, name: '許愿' }];
			if (table === gameRounds) {
				return [{ id: 21, gameId: 'game-1', round: 3, phase }];
			}
			return [];
		};

		const transaction = {
			select: vi.fn(() => ({
				from: (table: unknown) => {
					const resolveRows = () => Promise.resolve(rowsFor(table));
					const limitResult = {
						for: () => {
							if (table === gameRounds) lockRoundMock();
							return resolveRows();
						},
						then: <TResult1 = unknown, TResult2 = never>(
							onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
							onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
						) => resolveRows().then(onfulfilled, onrejected)
					};
					return { where: () => ({ limit: () => limitResult }) };
				}
			}))
		};

		dbMock.transaction.mockImplementation(async (callback) => callback(transaction));
	});

	function getGuard(): Guard | undefined {
		return (apiHelpers as unknown as { runIdentificationTransaction?: Guard })
			.runIdentificationTransaction;
	}

	it('鎖定第三回合後在同一 transaction 執行投票動作', async () => {
		const guard = getGuard();
		expect(guard).toBeTypeOf('function');
		if (!guard) return;

		const action = vi.fn(async ({ player }) => player.id);
		const result = await guard(
			new Request('http://localhost', { headers: { Authorization: 'Bearer token' } }),
			'123456',
			action
		);

		expect(result).toEqual({ data: 11 });
		expect(lockRoundMock).toHaveBeenCalledOnce();
		expect(action).toHaveBeenCalledOnce();
	});

	it('拒絕 identification 以外的回合階段', async () => {
		phase = 'result';
		const guard = getGuard();
		expect(guard).toBeTypeOf('function');
		if (!guard) return;

		const result = await guard(
			new Request('http://localhost', { headers: { Authorization: 'Bearer token' } }),
			'123456',
			vi.fn()
		);

		expect(result).toHaveProperty('error');
		if ('error' in result) expect(result.error.status).toBe(409);
	});
});
