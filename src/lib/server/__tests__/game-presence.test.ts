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

	it('重新連線只同步在線狀態，不會清除明確離房狀態', async () => {
		await updatePlayerOnlineStatus('game-1', 7, true);

		expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ isOnline: true }));
		expect(setMock.mock.calls[0][0]).not.toHaveProperty('leftAt');
		expect(setMock.mock.calls[0][0]).not.toHaveProperty('roomPresence');
	});

	it('重新連線時保留正式離房狀態', async () => {
		await updatePlayerOnlineStatus('game-1', 7, true);

		expect(setMock.mock.calls[0][0]).not.toHaveProperty('leftAt');
	});

	it('玩家斷線時只標記離線而不改變離房狀態', async () => {
		await updatePlayerOnlineStatus('game-1', 7, false);

		expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ isOnline: false }));
		expect(setMock.mock.calls[0][0]).not.toHaveProperty('leftAt');
	});
});
