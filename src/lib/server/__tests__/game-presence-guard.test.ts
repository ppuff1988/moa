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
type PlayerPresence = { isOnline: boolean; roomPresence: 'active' | 'left' };

describe('遊戲階段在線狀態 guard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function getGuard(): PresenceGuard | undefined {
		return (apiHelpers as unknown as { requireAllPlayersPresent?: PresenceGuard })
			.requireAllPlayersPresent;
	}

	function mockPlayers(players: PlayerPresence[]) {
		dbMock.select.mockReturnValue({
			from: () => ({ where: () => Promise.resolve(players) })
		});
	}

	it('暫時斷線但仍在房間的玩家不會阻擋下一步', async () => {
		mockPlayers([
			{ isOnline: false, roomPresence: 'active' },
			{ isOnline: true, roomPresence: 'active' }
		]);
		const guard = getGuard();
		expect(guard).toBeTypeOf('function');
		if (!guard) return;

		expect(await guard('game-1')).toBeNull();
	});

	it('明確離開房間的玩家會讓遊戲等待其回來', async () => {
		mockPlayers([
			{ isOnline: false, roomPresence: 'left' },
			{ isOnline: true, roomPresence: 'active' }
		]);
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
