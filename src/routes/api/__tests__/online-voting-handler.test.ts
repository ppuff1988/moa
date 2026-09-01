import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { artifactVoteAllocations } from '../../../lib/server/db/schema';

const mocks = vi.hoisted(() => ({
	transaction: vi.fn(),
	select: vi.fn(),
	emit: vi.fn(),
	verifyPlayerInRoom: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {
		transaction: mocks.transaction,
		select: mocks.select
	}
}));

vi.mock('$lib/server/api-helpers', () => ({
	getCurrentRoundOrError: vi.fn(),
	verifyPlayerInRoom: mocks.verifyPlayerInRoom
}));

vi.mock('$lib/server/socket', () => ({
	getSocketIO: () => ({
		to: () => ({ emit: mocks.emit })
	})
}));

vi.mock('$lib/server/game-voting', () => ({
	getPublishedOnlineVotingResult: vi.fn()
}));

import { POST } from '../room/[name]/online-voting/+server';

function createRequest() {
	return new Request('http://localhost/api/room/123456/online-voting', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ votes: {} })
	});
}

describe('POST /api/room/[name]/online-voting handler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.verifyPlayerInRoom.mockResolvedValue({
			game: {
				id: '11111111-1111-1111-1111-111111111111',
				roomName: '123456',
				onlineVotingEnabled: true
			},
			player: { id: 7 }
		});
	});

	it('acknowledges a committed vote without making another database read', async () => {
		const submittedPlayers = [{ playerId: 7, color: '紅', colorCode: '#EF4444' }];
		mocks.transaction.mockResolvedValue({
			currentRound: { id: 11, round: 1 },
			chipBalance: 2,
			completed: false,
			votingResult: null,
			submittedPlayers
		});
		mocks.select.mockImplementation(() => {
			throw new Error('post-commit progress read failed');
		});

		const response = await POST({
			request: createRequest(),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(200);
		expect(mocks.select).not.toHaveBeenCalled();
		expect(mocks.emit).toHaveBeenCalledWith('online-voting-progress', {
			round: 1,
			submittedPlayers
		});
	});

	it('returns a generic 500 response for unexpected transaction failures', async () => {
		mocks.transaction.mockRejectedValue(new Error('constraint game_vote_submissions_internal'));
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await POST({
			request: createRequest(),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ message: '提交投票失敗，請稍後再試' });
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});

	it('acknowledges a committed vote when progress broadcasting fails', async () => {
		mocks.transaction.mockResolvedValue({
			currentRound: { id: 11, round: 1 },
			chipBalance: 1,
			completed: false,
			votingResult: null,
			submittedPlayers: [{ playerId: 7, color: '紅', colorCode: '#EF4444' }]
		});
		mocks.emit.mockImplementation(() => {
			throw new Error('socket unavailable');
		});
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await POST({
			request: createRequest(),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(200);
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});
});

describe('online voting database constraints', () => {
	it('models the positive chip count constraint used by the SQL migration', () => {
		const table = getTableConfig(artifactVoteAllocations);

		expect(table.checks.map((constraint) => constraint.name)).toContain(
			'artifact_vote_allocations_chip_count_check'
		);
	});
});
