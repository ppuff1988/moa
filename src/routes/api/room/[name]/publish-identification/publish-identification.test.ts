import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameArtifacts, gameRounds, identificationVotes } from '$lib/server/db/schema';

const { dbMock, runGuardMock, verifyPlayerMock, getPlayersMock, calculateResultsMock } = vi.hoisted(
	() => ({
		dbMock: { select: vi.fn(), update: vi.fn() },
		runGuardMock: vi.fn(),
		verifyPlayerMock: vi.fn(),
		getPlayersMock: vi.fn(),
		calculateResultsMock: vi.fn()
	})
);

vi.mock('$lib/server/api-helpers', () => ({
	runIdentificationTransaction: runGuardMock,
	verifyPlayerInRoomWithStatus: verifyPlayerMock
}));
vi.mock('$lib/server/db', () => ({ db: dbMock }));
vi.mock('$lib/server/socket', () => ({ emitToRoom: vi.fn() }));
vi.mock('$lib/server/game-identification-helpers', () => ({
	getPlayersWithRoles: getPlayersMock,
	calculateIdentificationResults: calculateResultsMock,
	calculateIdentificationResultsFromVotes: calculateResultsMock,
	calculateIdentificationScore: vi.fn(() => 0),
	determineWinner: vi.fn(() => '老朝奉陣營')
}));

import { POST } from './+server';

describe('POST /publish-identification', () => {
	let storedVotes: Array<{
		id: number;
		playerId: number;
		votedLaoChaoFeng: number | null;
		votedXuYuan: number | null;
		votedFangZhen: number | null;
	}>;

	beforeEach(() => {
		vi.clearAllMocks();
		const game = {
			id: 'game-1',
			roomName: '123456',
			status: 'playing',
			totalScore: 0
		};
		const player = { id: 1, userId: 7, roleId: 3, isHost: true };
		const role = { id: 3, name: '許愿' };

		verifyPlayerMock.mockResolvedValue({ game, player });
		runGuardMock.mockImplementation(async (_request, _roomName, action) => ({
			data: await action({
				transaction: dbMock,
				game,
				player,
				role,
				currentRound: { id: 21, round: 3, phase: 'identification' }
			})
		}));
		getPlayersMock.mockResolvedValue([
			{
				playerId: 1,
				userId: 7,
				nickname: 'A',
				roleName: '許愿',
				camp: 'good',
				colorCode: '#fff'
			},
			{
				playerId: 2,
				userId: 8,
				nickname: 'B',
				roleName: '老朝奉',
				camp: 'bad',
				colorCode: '#000'
			}
		]);
		calculateResultsMock.mockReturnValue({ laoChaoFeng: null, xuYuan: null, fangZhen: null });
		storedVotes = [
			{
				id: 1,
				playerId: 1,
				votedLaoChaoFeng: 2,
				votedXuYuan: null,
				votedFangZhen: null
			}
		];

		dbMock.select.mockImplementation(() => ({
			from: (table: unknown) => {
				if (table === gameRounds) {
					return { where: () => ({ limit: async () => [{ id: 21, phase: 'identification' }] }) };
				}
				if (table === identificationVotes) {
					return { where: async () => storedVotes };
				}
				if (table === gameArtifacts) return { where: async () => [] };
				return { where: async () => [] };
			}
		}));
		dbMock.update.mockReturnValue({
			set: () => ({ where: vi.fn().mockResolvedValue(undefined) })
		});
	});

	it('票未收齊時即使房主也不能公布結果', async () => {
		const response = await POST({
			request: new Request('http://localhost', { method: 'POST' }),
			params: { name: '123456' }
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(409);
		expect(dbMock.update).not.toHaveBeenCalled();
	});

	it('票收齊後才在同一 transaction 完成遊戲與回合', async () => {
		storedVotes.push({
			id: 2,
			playerId: 2,
			votedLaoChaoFeng: null,
			votedXuYuan: 1,
			votedFangZhen: null
		});

		const response = await POST({
			request: new Request('http://localhost', { method: 'POST' }),
			params: { name: '123456' }
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		expect(dbMock.update).toHaveBeenCalledTimes(2);
		expect(calculateResultsMock).toHaveBeenCalledWith(expect.any(Array), storedVotes);
	});
});
