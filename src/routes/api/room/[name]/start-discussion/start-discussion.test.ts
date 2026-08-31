import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, guardTransaction, runGuardMock } = vi.hoisted(() => ({
	dbMock: { select: vi.fn(), update: vi.fn() },
	guardTransaction: { select: vi.fn(), update: vi.fn() },
	runGuardMock: vi.fn()
}));

vi.mock('$lib/server/api-helpers', () => ({
	runCurrentActionTransaction: runGuardMock,
	restoreCanActionIfNeeded: vi.fn(),
	verifyPlayerInRoomWithStatus: vi.fn().mockResolvedValue({
		game: { id: 'game-1', roomName: '123456' },
		player: { id: 11 }
	}),
	getCurrentRoundOrError: vi.fn().mockResolvedValue({
		round: { id: 21, round: 1, phase: 'action', actionOrder: [11, 10] }
	})
}));
vi.mock('$lib/server/db', () => ({ db: dbMock }));

import { POST } from './+server';

describe('POST /start-discussion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dbMock.select.mockReturnValue({
			from: () => ({
				where: () => ({ limit: vi.fn().mockResolvedValue([{ id: 11, roleId: null }]) })
			})
		});
		dbMock.update.mockReturnValue({
			set: () => ({ where: vi.fn().mockResolvedValue(undefined) })
		});

		guardTransaction.select.mockReturnValue({
			from: () => ({
				where: vi.fn().mockResolvedValue([{ id: 10 }, { id: 11 }, { id: 12 }])
			})
		});
		guardTransaction.update.mockReturnValue({
			set: () => ({ where: vi.fn().mockResolvedValue(undefined) })
		});
		runGuardMock.mockImplementation(async (_request, _roomName, action) => ({
			data: await action({
				transaction: guardTransaction,
				game: { id: 'game-1', roomName: '123456' },
				player: { id: 11 },
				role: { id: 3, skill: {} },
				currentRound: { id: 21, round: 1, phase: 'action', actionOrder: [11, 10] }
			})
		}));
	});

	it('仍有玩家未行動時拒絕進入討論', async () => {
		const response = await POST({
			request: new Request('http://localhost', { method: 'POST' }),
			params: { name: '123456' }
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(409);
		expect(guardTransaction.update).not.toHaveBeenCalled();
	});

	it('最後一位玩家可在全員完成後進入討論', async () => {
		guardTransaction.select.mockReturnValueOnce({
			from: () => ({
				where: vi.fn().mockResolvedValue([{ id: 10 }, { id: 11 }])
			})
		});

		const response = await POST({
			request: new Request('http://localhost', { method: 'POST' }),
			params: { name: '123456' }
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		expect(guardTransaction.update).toHaveBeenCalledOnce();
	});
});
