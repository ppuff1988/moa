import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => ({
	dbMock: { select: vi.fn(), transaction: vi.fn() }
}));

vi.mock('../db', () => ({ db: dbMock }));
vi.mock('../auth', () => ({
	verifyJWTWithError: vi.fn(),
	getUserFromJWT: vi.fn()
}));
vi.mock('../lucia', () => ({
	lucia: { sessionCookieName: 'auth_session', validateSession: vi.fn() }
}));

import * as apiHelpers from '../api-helpers';

type PresenceGuard = (gameId: string) => Promise<Response | null>;

describe('遊戲階段在線狀態 guard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function getGuard(): PresenceGuard | undefined {
		return (apiHelpers as unknown as { requireAllPlayersOnline?: PresenceGuard })
			.requireAllPlayersOnline;
	}

	function mockPlayers(players: Array<{ isOnline: boolean }>) {
		dbMock.select.mockReturnValue({
			from: () => ({ where: () => Promise.resolve(players) })
		});
	}

	it('全部玩家在線時允許進行下一步', async () => {
		mockPlayers([{ isOnline: true }, { isOnline: true }]);
		const guard = getGuard();
		expect(guard).toBeTypeOf('function');
		if (!guard) return;

		expect(await guard('game-1')).toBeNull();
	});

	it('任何仍在場玩家離線時回傳 GAME_PAUSED', async () => {
		mockPlayers([{ isOnline: true }, { isOnline: false }]);
		const guard = getGuard();
		expect(guard).toBeTypeOf('function');
		if (!guard) return;

		const response = await guard('game-1');
		expect(response?.status).toBe(409);
		expect(await response?.json()).toMatchObject({
			success: false,
			code: 'GAME_PAUSED'
		});
	});
});
