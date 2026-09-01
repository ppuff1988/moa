import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameActions, gameRounds, games } from '../db/schema';

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn()
	}
}));

vi.mock('../db', () => ({ db: dbMock }));

import { advanceToNextPlayer, startNewRound } from '../game';

describe('startNewRound', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('uses the previous turn order even when the last player skipped their skill', async () => {
		let roundReadCount = 0;
		let insertedRound: Record<string, unknown> | undefined;

		dbMock.select.mockImplementation(() => ({
			from: (table: unknown) => {
				const rows =
					table === gameRounds
						? ++roundReadCount === 1
							? [
									{
										id: 509,
										gameId: 'game-1',
										round: 2,
										completedAt: new Date(),
										actionOrder: [1556, 1557, 1561, 1559, 1555, 1558, 1560]
									}
								]
							: []
						: table === gameActions
							? [{ playerId: 1557, ordering: 10 }]
							: table === games
								? []
								: [];

				return {
					where: () => ({
						limit: async () => rows,
						orderBy: async () => rows
					})
				};
			}
		}));
		dbMock.insert.mockImplementation(() => ({
			values: (values: Record<string, unknown>) => ({
				returning: async () => {
					insertedRound = values;
					return [{ id: 510, ...values }];
				}
			})
		}));

		const result = await startNewRound('game-1', 3);

		expect(result.firstPlayerId).toBe(1556);
		expect(insertedRound).toMatchObject({ round: 3, actionOrder: [1556] });
	});

	it('does not record a round completion time when only the action phase ends', async () => {
		let updatedRound: Record<string, unknown> | undefined;

		dbMock.select.mockImplementation(() => ({
			from: (table: unknown) => {
				const rows =
					table === gameRounds
						? [{ id: 509, gameId: 'game-1', round: 2 }]
						: table === gameActions
							? []
							: [];

				return {
					where: () => ({
						limit: async () => rows,
						orderBy: async () => rows
					})
				};
			}
		}));
		dbMock.update.mockImplementation(() => ({
			set: (values: Record<string, unknown>) => ({
				where: async () => {
					updatedRound = values;
				}
			})
		}));

		const result = await advanceToNextPlayer('game-1', 509);

		expect(result).toMatchObject({ phaseChanged: true, newPhase: 'discussion' });
		expect(updatedRound).toEqual({ phase: 'discussion' });
	});
});
