import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { artifactVoteAllocations } from '../../../lib/server/db/schema';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
			totalPlayers: 2,
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
			submittedPlayers,
			totalPlayers: 2
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

	it('rejects a player who explicitly left the room', async () => {
		mocks.verifyPlayerInRoom.mockResolvedValue({
			game: {
				id: '11111111-1111-1111-1111-111111111111',
				roomName: '123456',
				onlineVotingEnabled: true
			},
			player: { id: 7, leftAt: new Date() }
		});

		const response = await POST({
			request: createRequest(),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ message: '您已離開此房間' });
		expect(mocks.transaction).not.toHaveBeenCalled();
	});
});

describe('online voting database constraints', () => {
	it('models the positive chip count constraint used by the SQL migration', () => {
		const table = getTableConfig(artifactVoteAllocations);

		expect(table.checks.map((constraint) => constraint.name)).toContain(
			'artifact_vote_allocations_chip_count_check'
		);
	});

	it('documents that disconnected players remain in the quorum while explicit departures do not', () => {
		const endpoint = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/online-voting/+server.ts'),
			'utf8'
		);
		const rules = readFileSync(resolve(process.cwd(), 'docs/RULE.md'), 'utf8');

		expect(endpoint).toContain('isOnline 不影響投票資格');
		expect(endpoint).toContain('leftAt 不為空的玩家已主動離開');
		expect(rules).toContain('Socket 斷線而暫時離線時，只會將 `is_online` 標記為 `false`');
		expect(rules).toContain('主動離開房間才會設定 `left_at`');
	});
});
