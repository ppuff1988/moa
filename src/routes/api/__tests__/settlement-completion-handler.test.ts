import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	select: vi.fn(),
	update: vi.fn(),
	updateSet: vi.fn(),
	verifyPlayerInRoomWithStatus: vi.fn(),
	emitToRoom: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: mocks.select,
		update: mocks.update
	}
}));

vi.mock('$lib/server/api-helpers', () => ({
	verifyPlayerInRoomWithStatus: mocks.verifyPlayerInRoomWithStatus
}));

vi.mock('$lib/server/socket', () => ({
	emitToRoom: mocks.emitToRoom
}));

import { POST } from '../room/[name]/calculate-settlement/+server';

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

function joinedSelectResult<T>(rows: T[]) {
	return {
		from: () => ({
			leftJoin: () => ({
				innerJoin: () => ({
					where: () => Promise.resolve(rows)
				})
			})
		})
	};
}

describe('POST /api/room/[name]/calculate-settlement completion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.select.mockReset();
		mocks.update.mockReset();
		mocks.updateSet.mockReset();
		mocks.verifyPlayerInRoomWithStatus.mockResolvedValue({
			game: { id: '11111111-1111-1111-1111-111111111111' },
			player: { isHost: true }
		});
		mocks.update.mockReturnValue({ set: mocks.updateSet });
		mocks.updateSet.mockReturnValue({ where: () => Promise.resolve() });
	});

	it('records the third-round completion time when six genuine artifacts win', async () => {
		const selectedArtifacts = Array.from({ length: 6 }, (_, index) => ({
			id: index + 1,
			round: Math.floor(index / 2) + 1,
			animal: `artifact-${index + 1}`,
			isGenuine: true,
			voteRank: (index % 2) + 1,
			votes: 1
		}));
		mocks.select
			.mockImplementationOnce(() => limitedSelectResult([{ id: 30, phase: 'result' }]))
			.mockImplementationOnce(() => selectResult(selectedArtifacts))
			.mockImplementationOnce(() => joinedSelectResult([]));

		const response = await POST({
			request: new Request('http://localhost/api/room/123456/calculate-settlement', {
				method: 'POST'
			}),
			params: { name: '123456' }
		} as never);

		expect(response.status).toBe(200);
		expect(mocks.updateSet).toHaveBeenNthCalledWith(2, {
			phase: 'completed',
			completedAt: expect.any(Date)
		});
	});
});
