import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gamePlayers } from '../db/schema';

const {
	dbMock,
	emitMock,
	enqueuePresenceTransitionMock,
	forceEndGameMock,
	getSocketIOMock,
	removePlayerSocketsFromRoomMock,
	playerUpdates,
	verifyPlayerInRoomMock
} = vi.hoisted(() => ({
	dbMock: {
		select: vi.fn(),
		update: vi.fn(),
		transaction: vi.fn()
	},
	emitMock: vi.fn(),
	enqueuePresenceTransitionMock: vi.fn(),
	forceEndGameMock: vi.fn(),
	getSocketIOMock: vi.fn(() => null),
	removePlayerSocketsFromRoomMock: vi.fn(),
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
vi.mock('../socket', () => ({
	enqueuePresenceTransition: enqueuePresenceTransitionMock,
	getSocketIO: getSocketIOMock,
	removePlayerSocketsFromRoom: removePlayerSocketsFromRoomMock
}));

import { POST } from '../../../routes/api/room/[name]/leave/+server';

describe('playing game leave presence', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		playerUpdates.length = 0;
		enqueuePresenceTransitionMock.mockImplementation(
			(_roomName: string, _userId: number, transition: () => Promise<unknown>) => transition()
		);
		removePlayerSocketsFromRoomMock.mockResolvedValue(undefined);
		getSocketIOMock.mockReturnValue({
			to: vi.fn(() => ({ emit: emitMock }))
		} as never);
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

	it('遊戲中玩家明確離開時失去房間資格並等待重新加入', async () => {
		const response = await POST({
			request: new Request('http://localhost/api/room/123456/leave', { method: 'POST' }),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ gamePaused: true });
		expect(playerUpdates).toContainEqual(
			expect.objectContaining({
				isOnline: false,
				roomPresence: 'left',
				leftAt: expect.any(Date)
			})
		);
		expect(playerUpdates.some((values) => 'leftAt' in values)).toBe(true);
		expect(forceEndGameMock).not.toHaveBeenCalled();
		expect(enqueuePresenceTransitionMock).toHaveBeenCalledWith('123456', 8, expect.any(Function));
	});

	it('明確離開時清除所有 Socket 並標記房間狀態', async () => {
		const response = await POST({
			request: new Request('http://localhost/api/room/123456/leave', { method: 'POST' }),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(200);
		expect(playerUpdates).toContainEqual(
			expect.objectContaining({
				isOnline: false,
				roomPresence: 'left',
				leftAt: expect.any(Date)
			})
		);
		expect(removePlayerSocketsFromRoomMock).toHaveBeenCalledWith('123456', 8);
		expect(emitMock).toHaveBeenCalledWith('player-left-room', {
			userId: 8,
			nickname: '暫離玩家'
		});
		expect(enqueuePresenceTransitionMock).toHaveBeenCalledWith('123456', 8, expect.any(Function));
	});
});
