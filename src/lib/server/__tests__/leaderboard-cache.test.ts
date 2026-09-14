import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = {
	execute: vi.fn()
};

vi.mock('../db', () => ({ db: dbMock }));
vi.mock('../leaderboard-query', () => ({
	buildLeaderboardQuery: vi.fn(() => 'leaderboard query')
}));

const { getLeaderboard } = await import('../leaderboard');

describe('leaderboard cache', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		dbMock.execute.mockReset().mockResolvedValue([
			{
				entries: [],
				roles: [],
				totalPlayers: 0,
				totalGames: 0,
				totalWins: 0,
				leaderWins: 0,
				leaderCount: 0,
				leaders: [],
				lastFinishedAt: null
			}
		]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reuses a result for 60 seconds and refreshes after the TTL', async () => {
		await getLeaderboard(null);
		vi.advanceTimersByTime(59_999);
		await getLeaderboard(null);
		expect(dbMock.execute).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1);
		await getLeaderboard(null);
		expect(dbMock.execute).toHaveBeenCalledTimes(2);
	});
});
