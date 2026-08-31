import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, joinGameMock } = vi.hoisted(() => ({
	dbMock: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn()
	},
	joinGameMock: vi.fn()
}));

vi.mock('$lib/server/api-helpers', () => ({
	verifyAuthToken: vi.fn().mockResolvedValue({
		user: { id: 101, nickname: '玩家', avatar: null }
	})
}));
vi.mock('$lib/server/db', () => ({ db: dbMock }));
vi.mock('$lib/server/game', () => ({
	joinGame: joinGameMock,
	getGameState: vi.fn()
}));
vi.mock('$lib/server/socket', () => ({ getSocketIO: vi.fn(() => null) }));

import { POST } from './+server';

describe('POST /api/room/join', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dbMock.select.mockReset();
		joinGameMock.mockResolvedValue({
			id: 9,
			userId: 101,
			nickname: '玩家',
			avatar: null,
			isHost: false
		});

		dbMock.select
			.mockReturnValueOnce({
				from: () => ({
					where: () => ({
						limit: vi.fn().mockResolvedValue([
							{
								id: 'game-1',
								roomName: '123456',
								roomPassword: 'secret',
								status: 'waiting',
								playerCount: 7
							}
						])
					})
				})
			})
			.mockReturnValueOnce({
				from: () => ({
					where: () => ({ limit: vi.fn().mockResolvedValue([]) })
				})
			});
		dbMock.insert.mockReturnValue({
			values: () => ({ returning: vi.fn().mockResolvedValue([{ id: 9 }]) })
		});
		dbMock.update.mockReturnValue({
			set: () => ({ where: vi.fn().mockResolvedValue(undefined) })
		});
	});

	it('透過具交易保護的 joinGame 加入房間', async () => {
		const request = new Request('http://localhost/api/room/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ roomName: '123456', password: 'secret' })
		});

		const response = await POST({ request } as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		expect(joinGameMock).toHaveBeenCalledWith('game-1', 101);
	});

	it('不把非預期的資料庫錯誤內容回傳給客戶端', async () => {
		joinGameMock.mockRejectedValueOnce(new Error('database connection details'));
		const request = new Request('http://localhost/api/room/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ roomName: '123456', password: 'secret' })
		});

		await expect(POST({ request } as Parameters<typeof POST>[0])).rejects.toThrow(
			'database connection details'
		);
	});
});
