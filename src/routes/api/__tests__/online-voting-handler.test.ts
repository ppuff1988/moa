import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { artifactVoteAllocations } from '../../../lib/server/db/schema';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
	transaction: vi.fn(),
	select: vi.fn(),
	emit: vi.fn(),
	verifyPlayerInRoom: vi.fn(),
	requireAllPlayersPresent: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {
		transaction: mocks.transaction,
		select: mocks.select
	}
}));

vi.mock('$lib/server/api-helpers', () => ({
	getCurrentRoundOrError: vi.fn(),
	verifyPlayerInRoom: mocks.verifyPlayerInRoom,
	requireAllPlayersPresent: mocks.requireAllPlayersPresent
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
		mocks.requireAllPlayersPresent.mockResolvedValue(null);
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

	it('allows voting while another player is temporarily disconnected', async () => {
		mocks.transaction.mockResolvedValue({
			currentRound: { id: 11, round: 1 },
			chipBalance: 1,
			completed: false,
			votingResult: null,
			submittedPlayers: [{ playerId: 7, color: '紅', colorCode: '#EF4444' }]
		});

		const response = await POST({
			request: createRequest(),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(200);
		expect(mocks.transaction).toHaveBeenCalled();
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

	it('documents that active games retain seats and wait only for explicitly departed players', () => {
		const endpoint = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/online-voting/+server.ts'),
			'utf8'
		);
		const rules = readFileSync(resolve(process.cwd(), 'docs/RULE.md'), 'utf8');

		expect(endpoint).toContain('席位與投票資格不變');
		expect(endpoint).toContain('明確離開房間的玩家重新加入前');
		expect(rules).toContain('手機縮小、背景休眠、網路短暫中斷');
		expect(rules).toContain('不設定離房期限，也不因人數不足自動結束');
	});
});
