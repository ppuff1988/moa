import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gamePlayers, games, user } from '../db/schema';

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		transaction: vi.fn()
	}
}));

vi.mock('../db', () => ({ db: dbMock }));

import { joinGame } from '../game';

describe('joinGame', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('七人房同時加入兩人時只保留一個名額', async () => {
		const game = {
			id: 'game-1',
			status: 'waiting',
			playerCount: 7
		};
		const insertedPlayers: Array<{ gameId: string; userId: number }> = [];
		let directGameReads = 0;
		let releaseDirectReads: (() => void) | undefined;
		const directReadsReady = new Promise<void>((resolve) => {
			releaseDirectReads = resolve;
		});

		const createClient = (transactional: boolean) => ({
			select: vi.fn(() => ({
				from: (table: unknown) => ({
					where: () => ({
						limit: () => {
							const read = async () => {
								if (table === games) {
									if (!transactional) {
										directGameReads += 1;
										if (directGameReads === 2) releaseDirectReads?.();
										await directReadsReady;
									}
									return [{ ...game }];
								}
								if (table === gamePlayers) return [];
								if (table === user) return [{ nickname: '玩家', avatar: null }];
								return [];
							};
							return {
								for: () => read(),
								then: <TResult1 = unknown, TResult2 = never>(
									onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
									onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
								) => read().then(onfulfilled, onrejected)
							};
						}
					})
				})
			})),
			insert: vi.fn(() => ({
				values: (player: { gameId: string; userId: number }) => ({
					returning: async () => {
						insertedPlayers.push(player);
						return [{ id: insertedPlayers.length, ...player }];
					}
				})
			})),
			update: vi.fn(() => ({
				set: (values: { playerCount?: number }) => ({
					where: async () => {
						if (values.playerCount !== undefined) game.playerCount = values.playerCount;
					}
				})
			}))
		});

		const directClient = createClient(false);
		dbMock.select.mockImplementation(directClient.select);
		dbMock.insert.mockImplementation(directClient.insert);
		dbMock.update.mockImplementation(directClient.update);

		const transactionClient = createClient(true);
		let previousTransaction = Promise.resolve();
		dbMock.transaction.mockImplementation(async (callback) => {
			const waitForPrevious = previousTransaction;
			let finishTransaction!: () => void;
			previousTransaction = new Promise<void>((resolve) => {
				finishTransaction = resolve;
			});
			await waitForPrevious;
			try {
				return await callback(transactionClient);
			} finally {
				finishTransaction();
			}
		});

		const results = await Promise.allSettled([joinGame(game.id, 101), joinGame(game.id, 102)]);

		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
		expect(results.find((result) => result.status === 'rejected')).toMatchObject({
			reason: expect.objectContaining({ message: '房間已滿' })
		});
		expect(insertedPlayers).toHaveLength(1);
		expect(game.playerCount).toBe(8);
	});
});
