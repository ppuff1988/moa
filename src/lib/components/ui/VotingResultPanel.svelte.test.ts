import { render } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import VotingResultPanel from './VotingResultPanel.svelte';

describe('VotingResultPanel round transition', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('keeps the next-round action locked until the parent finishes synchronizing', async () => {
		let finishSynchronization: (() => void) | undefined;
		const synchronization = new Promise<void>((resolve) => {
			finishSynchronization = resolve;
		});
		const onNextRound = vi.fn(() => synchronization);
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(JSON.stringify({ success: true, round: 2 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		const screen = render(VotingResultPanel, {
			roomName: '123456',
			votingResult: {
				round: 1,
				firstPlace: { id: 1, animal: '龍', votes: 3, rank: 1 },
				secondPlace: { id: 2, animal: '蛇', votes: 2, rank: 2, isGenuine: true }
			},
			isHost: true,
			currentRound: 1,
			onNextRound
		});

		await screen.getByRole('button', { name: '開始第二回合' }).click();
		await vi.waitFor(() => expect(onNextRound).toHaveBeenCalledOnce());
		await screen.rerender({ currentRound: 2 });

		try {
			const button = screen.getByRole('button', { name: '啟動中...' });
			await expect.element(button).toBeDisabled();
			await expect.element(screen.getByText('開始第三回合')).not.toBeInTheDocument();
		} finally {
			finishSynchronization?.();
		}
		await vi.waitFor(() => expect(onNextRound).toHaveResolved());
	});
});
