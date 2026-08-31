import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gamePlayers, gameRounds, identificationVotes } from '$lib/server/db/schema';

const { dbMock, runGuardMock, verifyPlayerMock, insertMock, getPlayersMock } = vi.hoisted(() => ({
	dbMock: { select: vi.fn(), insert: vi.fn() },
	runGuardMock: vi.fn(),
	verifyPlayerMock: vi.fn(),
	insertMock: vi.fn(),
	getPlayersMock: vi.fn()
}));

vi.mock('$lib/server/api-helpers', () => ({
	runIdentificationTransaction: runGuardMock,
	verifyPlayerInRoomWithStatus: verifyPlayerMock
}));
vi.mock('$lib/server/db', () => ({ db: dbMock }));
vi.mock('$lib/server/socket', () => ({ emitToRoom: vi.fn(), getSocketIO: vi.fn(() => null) }));
vi.mock('$lib/server/game-identification-helpers', () => ({
	getPlayersWithRoles: getPlayersMock
}));

import { POST } from './+server';

describe('POST /submit-identification', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		const game = { id: 'game-1', roomName: '123456', status: 'playing' };
		const player = { id: 1, userId: 7, roleId: 3 };
		const role = { id: 3, name: '許愿' };

		verifyPlayerMock.mockResolvedValue({ game, player });
		runGuardMock.mockImplementation(async (_request, _roomName, action) => ({
			data: await action({ transaction: dbMock, game, player, role })
		}));
		getPlayersMock.mockResolvedValue([
			{ playerId: 1, roleName: '許愿' },
			{ playerId: 2, roleName: '老朝奉' }
		]);

		let joinedPlayerQuery = 0;
		dbMock.select.mockImplementation(() => ({
			from: (table: unknown) => {
				if (table === gameRounds) {
					return { where: () => ({ limit: async () => [{ id: 21, phase: 'identification' }] }) };
				}
				if (table === identificationVotes) {
					return {
						where: () => ({
							limit: async () => [],
							then: (resolve: (value: unknown[]) => unknown) => Promise.resolve([]).then(resolve)
						})
					};
				}
				if (table === gamePlayers) {
					return {
						innerJoin: () => ({
							where: () => {
								joinedPlayerQuery += 1;
								const rows =
									joinedPlayerQuery === 1
										? [{ name: '許愿' }]
										: [
												{ playerId: 1, roleName: '許愿' },
												{ playerId: 2, roleName: '老朝奉' }
											];
								return {
									limit: async () => rows,
									then: (resolve: (value: unknown[]) => unknown) =>
										Promise.resolve(rows).then(resolve)
								};
							}
						})
					};
				}
				return { where: async () => [] };
			}
		}));
		dbMock.insert.mockReturnValue({ values: insertMock.mockResolvedValue(undefined) });
	});

	it('拒絕所有角色目標都為空的投票', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ votes: {} })
		});

		const response = await POST({ request, params: { name: '123456' } } as Parameters<
			typeof POST
		>[0]);

		expect(response.status).toBe(400);
		expect(insertMock).not.toHaveBeenCalled();
	});

	it('只儲存目前角色所需的合法票種', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ votes: { laoChaoFeng: 2 } })
		});

		const response = await POST({ request, params: { name: '123456' } } as Parameters<
			typeof POST
		>[0]);

		expect(response.status).toBe(200);
		expect(insertMock).toHaveBeenCalledWith({
			gameId: 'game-1',
			playerId: 1,
			votedLaoChaoFeng: 2,
			votedXuYuan: null,
			votedFangZhen: null
		});
	});
});
