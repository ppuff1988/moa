import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ioMock } = vi.hoisted(() => ({ ioMock: vi.fn() }));

vi.mock('socket.io-client', () => ({ io: ioMock }));
vi.mock('../jwt', () => ({ getJWTToken: vi.fn(() => null) }));

import { disconnectSocket, initSocket } from '../socket';

function createSocket() {
	return {
		connected: false,
		on: vi.fn(),
		removeAllListeners: vi.fn(),
		disconnect: vi.fn()
	};
}

describe('initSocket', () => {
	beforeEach(() => {
		disconnectSocket();
		ioMock.mockReset();
		ioMock.mockReturnValue(createSocket());
	});

	it('在暫時性服務中斷時持續重試連線', () => {
		initSocket();

		expect(ioMock).toHaveBeenCalledWith(
			expect.objectContaining({
				reconnection: true,
				reconnectionAttempts: Infinity
			})
		);
	});
});
