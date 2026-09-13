import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, setMock, whereMock } = vi.hoisted(() => ({
	dbMock: { update: vi.fn() },
	setMock: vi.fn(),
	whereMock: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../db', () => ({ db: dbMock }));

import { updatePlayerOnlineStatus } from '../game';

describe('updatePlayerOnlineStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setMock.mockImplementation(() => ({ where: whereMock }));
		dbMock.update.mockReturnValue({ set: setMock });
	});

	it('玩家重新連線時恢復原座位並清除舊的離房狀態', async () => {
		await updatePlayerOnlineStatus('game-1', 7, true);

		expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ isOnline: true, leftAt: null }));
	});

	it('玩家斷線時只標記離線而不改變離房狀態', async () => {
		await updatePlayerOnlineStatus('game-1', 7, false);

		expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ isOnline: false }));
		expect(setMock.mock.calls[0][0]).not.toHaveProperty('leftAt');
	});
});
