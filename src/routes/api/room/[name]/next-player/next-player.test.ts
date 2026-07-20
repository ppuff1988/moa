import { beforeEach, describe, expect, it, vi } from 'vitest';

const { transaction, runGuardMock, restoreMock } = vi.hoisted(() => {
	const transaction = {
		select: vi.fn(),
		update: vi.fn()
	};
	return {
		transaction,
		runGuardMock: vi.fn(),
		restoreMock: vi.fn()
	};
});

vi.mock('$lib/server/api-helpers', () => ({
	runCurrentActionTransaction: runGuardMock,
	restoreCanActionIfNeeded: restoreMock,
	verifyPlayerInRoom: vi.fn().mockResolvedValue({
		game: { id: 'game-1', roomName: '123456' },
		player: { id: 11, roleId: 3, canAction: true }
	}),
	getCurrentRoundOrError: vi.fn().mockResolvedValue({
		round: { id: 21, round: 1, phase: 'action', actionOrder: [11, 10] }
	})
}));
vi.mock('$lib/server/db', () => ({ db: transaction }));
vi.mock('$lib/server/socket', () => ({ getSocketIO: vi.fn(() => null) }));

import { POST } from './+server';

describe('POST /next-player', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		transaction.select.mockReturnValue({
			from: () => ({
				where: () => ({
					limit: vi.fn().mockResolvedValue([{ id: 10, gameId: 'game-1' }])
				})
			})
		});
		transaction.update.mockReturnValue({
			set: () => ({ where: vi.fn().mockResolvedValue(undefined) })
		});
		runGuardMock.mockImplementation(async (_request, _roomName, action) => ({
			data: await action({
				transaction,
				game: { id: 'game-1', roomName: '123456' },
				player: { id: 11, roleId: 3, canAction: true },
				role: { id: 3, skill: {} },
				currentRound: { id: 21, round: 1, phase: 'action', actionOrder: [11, 10] }
			})
		}));
	});

	it('拒絕把回合交給已行動玩家', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ nextPlayerId: 10 })
		});

		const response = await POST({ request, params: { name: '123456' } } as Parameters<
			typeof POST
		>[0]);

		expect(response.status).toBe(409);
		expect(transaction.update).not.toHaveBeenCalled();
	});

	it('當前玩家可以不使用技能並把回合交給尚未行動玩家', async () => {
		runGuardMock.mockImplementationOnce(async (_request, _roomName, action) => ({
			data: await action({
				transaction,
				game: { id: 'game-1', roomName: '123456' },
				player: { id: 11, roleId: 3, canAction: true },
				role: { id: 3, skill: { swap: 1 } },
				currentRound: { id: 21, round: 1, phase: 'action', actionOrder: [11] }
			})
		}));
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ nextPlayerId: 10 })
		});

		const response = await POST({ request, params: { name: '123456' } } as Parameters<
			typeof POST
		>[0]);

		expect(response.status).toBe(200);
		expect(transaction.update).toHaveBeenCalledOnce();
	});
});
