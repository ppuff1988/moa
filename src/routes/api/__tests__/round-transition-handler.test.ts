import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	select: vi.fn(),
	transaction: vi.fn(),
	updateSet: vi.fn(),
	insertValues: vi.fn(),
	verifyHostPermission: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: mocks.select,
		transaction: mocks.transaction
	}
}));

vi.mock('$lib/server/socket', () => ({
	getSocketIO: () => null
}));

vi.mock('$lib/server/api-helpers', () => ({
	verifyHostPermission: mocks.verifyHostPermission
}));

vi.mock('$lib/server/game', () => ({
	startAutoAssignedGame: vi.fn(),
	startGame: vi.fn(),
	startRoleSelection: vi.fn()
}));

import { POST } from '../room/[name]/start/+server';

function selectResult<T>(rows: T[]) {
	return {
		from: () => ({
			where: () => Promise.resolve(rows)
		})
	};
}

function limitedSelectResult<T>(rows: T[]) {
	return {
		from: () => ({
			where: () => ({
				limit: () => Promise.resolve(rows)
			})
		})
	};
}

function createRequest(round: number) {
	return new Request('http://localhost/api/room/123456/start', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ round })
	});
}

describe('POST /api/room/[name]/start round transition', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.select.mockReset();
		mocks.transaction.mockReset();
		mocks.updateSet.mockReset();
		mocks.insertValues.mockReset();
		mocks.verifyHostPermission.mockResolvedValue({
			game: { id: '11111111-1111-1111-1111-111111111111', status: 'playing' }
		});
	});

	it.each(['action', 'discussion', 'voting'])(
		'rejects starting round 3 while round 2 is still in %s',
		async (phase) => {
			mocks.select
				.mockImplementationOnce(() => selectResult([{ id: 7 }]))
				.mockImplementationOnce(() =>
					limitedSelectResult([
						{
							id: 22,
							round: 2,
							phase,
							completedAt: phase === 'action' ? null : new Date()
						}
					])
				)
				.mockImplementationOnce(() => limitedSelectResult([{ id: 33, round: 3 }]));

			const response = await POST({
				request: createRequest(3),
				params: { name: '123456' }
			} as never);

			expect(response.status).toBe(409);
			expect(await response.json()).toEqual({
				message: `第 2 回合尚未完成投票結果公布`
			});
			expect(mocks.select).toHaveBeenCalledTimes(2);
		}
	);

	it('completes the previous result round when starting the next round', async () => {
		mocks.select
			.mockImplementationOnce(() => selectResult([{ id: 7 }]))
			.mockImplementationOnce(() =>
				limitedSelectResult([
					{
						id: 22,
						round: 2,
						phase: 'result',
						completedAt: null,
						actionOrder: [2394, 2398, 2400]
					}
				])
			)
			.mockImplementationOnce(() => limitedSelectResult([]));

		mocks.updateSet.mockReturnValue({ where: () => Promise.resolve() });
		mocks.insertValues.mockReturnValue({
			returning: () => Promise.resolve([{ id: 33 }])
		});
		mocks.transaction.mockImplementation(async (callback) =>
			callback({
				update: () => ({ set: mocks.updateSet }),
				insert: () => ({ values: mocks.insertValues })
			})
		);

		const response = await POST({
			request: createRequest(3),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(200);
		expect(mocks.transaction).toHaveBeenCalledOnce();
		expect(mocks.updateSet).toHaveBeenCalledWith({
			phase: 'completed',
			completedAt: expect.any(Date)
		});
		expect(mocks.insertValues).toHaveBeenCalledWith({
			gameId: '11111111-1111-1111-1111-111111111111',
			round: 3,
			phase: 'action',
			actionOrder: [2394]
		});
	});
});
