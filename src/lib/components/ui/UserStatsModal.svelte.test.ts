import { render } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UserStatsModal from './UserStatsModal.svelte';

describe('UserStatsModal history presentation', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		document.body.style.overflow = '';
	});

	it('prioritizes win rate, red and black camp records, and recent match history', async () => {
		const statsResponse = {
			totalGames: 8,
			totalWins: 5,
			winRate: 63,
			xuYuanWins: 3,
			laoChaoFengWins: 2,
			roleStats: [
				{ name: '許愿', count: 3 },
				{ name: '老朝奉', count: 2 }
			],
			recentGames: [
				{
					gameId: 'game-red-win',
					roleName: '許愿',
					camp: '許愿陣營',
					result: '勝利',
					score: 7,
					finishedAt: '2026-08-31T12:30:00.000Z'
				},
				{
					gameId: 'game-black-loss',
					roleName: '老朝奉',
					camp: '老朝奉陣營',
					result: '失敗',
					score: 6,
					finishedAt: '2026-08-30T10:00:00.000Z'
				}
			]
		};
		const fetchMock = vi.fn<typeof fetch>().mockImplementation(
			async () =>
				new Response(JSON.stringify(statsResponse), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
		);
		vi.stubGlobal('fetch', fetchMock);

		const screen = render(UserStatsModal, { isOpen: true, onClose: vi.fn() });

		await expect.element(screen.getByRole('dialog', { name: '歷史戰績' })).toBeVisible();
		await expect.element(screen.getByLabelText('整體勝率 63%')).toBeVisible();
		await expect.element(screen.getByText('8 場')).toBeVisible();
		await expect.element(screen.getByText('5 勝')).toBeVisible();
		await expect.element(screen.getByText('👼')).toBeVisible();
		await expect.element(screen.getByText('😈')).toBeVisible();

		await vi.waitFor(() => {
			expect(document.querySelector('[data-faction-color="red"]')).not.toBeNull();
			expect(document.querySelector('[data-faction-color="black"]')).not.toBeNull();
			expect(document.querySelectorAll('.game-list > li')).toHaveLength(2);
		});

		await expect.element(screen.getByRole('heading', { name: '許愿陣營' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { name: '老朝奉陣營' })).toBeVisible();
		expect(fetchMock).toHaveBeenCalledWith('/api/user/stats', { credentials: 'include' });
	});
});
