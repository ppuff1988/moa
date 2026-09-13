import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gamePlayers } from '../db/schema';

const { dbMock, forceEndGameMock, getSocketIOMock, playerUpdates, verifyPlayerInRoomMock } =
	vi.hoisted(() => ({
		dbMock: {
			select: vi.fn(),
			update: vi.fn(),
			transaction: vi.fn()
		},
		forceEndGameMock: vi.fn(),
		getSocketIOMock: vi.fn(() => null),
		playerUpdates: [] as Array<Record<string, unknown>>,
		verifyPlayerInRoomMock: vi.fn()
	}));

vi.mock('../db', () => ({ db: dbMock }));
vi.mock('../api-helpers', () => ({ verifyPlayerInRoom: verifyPlayerInRoomMock }));
vi.mock('../game', () => ({
	forceEndGame: forceEndGameMock,
	getGameState: vi.fn()
}));
vi.mock('../game-voting', () => ({ finalizeOnlineVotingIfComplete: vi.fn() }));
vi.mock('../socket', () => ({ getSocketIO: getSocketIOMock }));

import { POST } from '../../../routes/api/room/[name]/leave/+server';

describe('playing game leave presence', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		playerUpdates.length = 0;
		verifyPlayerInRoomMock.mockResolvedValue({
			user: { id: 8, nickname: '暫離玩家' },
			game: {
				id: 'game-1',
				roomName: '123456',
				hostId: 7,
				status: 'playing',
				playerCount: 6,
				onlineVotingEnabled: false
			},
			player: { id: 18, userId: 8 }
		});

		dbMock.select.mockReturnValue({
			from: () => ({
				where: () => ({ limit: async () => [{ status: 'playing' }] })
			})
		});
		dbMock.update.mockImplementation((table: unknown) => ({
			set: (values: Record<string, unknown>) => ({
				where: async () => {
					if (table === gamePlayers) playerUpdates.push(values);
				}
			})
		}));

		const transaction = {
			select: vi.fn(() => ({
				from: () => ({
					where: () => ({
						orderBy: () => ({
							limit: () => ({ for: async () => [{ id: 21, round: 1, phase: 'action' }] })
						}),
						then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve([]).then(resolve)
					})
				})
			})),
			update: dbMock.update
		};
		dbMock.transaction.mockImplementation(async (callback) => callback(transaction));
	});

	it('遊戲中玩家暫離時保留座位且不因人數不足終止遊戲', async () => {
		const response = await POST({
			request: new Request('http://localhost/api/room/123456/leave', { method: 'POST' }),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ gamePaused: true });
		expect(playerUpdates).toContainEqual(expect.objectContaining({ isOnline: false }));
		expect(playerUpdates.some((values) => 'leftAt' in values)).toBe(false);
		expect(forceEndGameMock).not.toHaveBeenCalled();
	});
});
