import { describe, expect, it, vi } from 'vitest';

import { requestNextRound } from './nextRound';

describe('requestNextRound', () => {
	it('waits for game-state synchronization after the server starts the round', async () => {
		let finishSynchronization: (() => void) | undefined;
		const synchronization = new Promise<void>((resolve) => {
			finishSynchronization = resolve;
		});
		const onNextRound = vi.fn(() => synchronization);
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(JSON.stringify({ success: true, round: 2 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);

		let settled = false;
		const request = requestNextRound({
			roomName: 'room / one',
			currentRound: 1,
			onNextRound,
			fetcher
		}).then((response) => {
			settled = true;
			return response;
		});

		await vi.waitFor(() => expect(onNextRound).toHaveBeenCalledOnce());
		expect(settled).toBe(false);

		finishSynchronization?.();
		await expect(request).resolves.toMatchObject({ ok: true });
		expect(fetcher).toHaveBeenCalledWith('/api/room/room%20%2F%20one/start', {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ round: 2 })
		});
	});
});
