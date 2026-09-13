import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import LeaderboardView from './LeaderboardView.svelte';
import type { LeaderboardResult } from '$lib/types/leaderboard';

const results: LeaderboardResult & { selectedRoleId: number | null } = {
	selectedRoleId: null,
	entries: [
		{ userId: 1, nickname: '青禾', rank: 1, wins: 12, games: 20, winRate: 60 },
		{ userId: 2, nickname: '墨竹', rank: 1, wins: 12, games: 18, winRate: 66.7 }
	],
	roles: [
		{
			id: 5,
			name: '老朝奉',
			camp: 'bad',
			leaderWins: 7,
			leaderCount: 2,
			leaders: [
				{ userId: 1, nickname: '青禾' },
				{ userId: 2, nickname: '墨竹' }
			]
		},
		{ id: 6, name: '藥不然', camp: 'bad', leaderWins: 0, leaderCount: 0, leaders: [] }
	],
	totalPlayers: 2,
	totalGames: 30,
	totalWins: 24,
	page: 1,
	totalPages: 1,
	leaderWins: 12,
	leaderCount: 2,
	leaders: [
		{ userId: 1, nickname: '青禾' },
		{ userId: 2, nickname: '墨竹' }
	],
	lastFinishedAt: '2026-09-13T10:00:00Z'
};

describe('leaderboard honors presentation', () => {
	it('shows tied award winners and role-specific honors without awarding unused roles', async () => {
		const screen = render(LeaderboardView, { leaderboard: results });
		await expect
			.element(screen.getByRole('heading', { name: '鑑局魁首', exact: true }))
			.toBeVisible();
		await expect.element(screen.getByText('並列得主 · 2 位').first()).toBeVisible();
		await expect
			.element(screen.getByRole('heading', { name: '偷天換日', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('heading', { name: '笑裡藏刀', exact: true }))
			.toBeVisible();
		await expect.element(screen.getByText('笑意未退，偷襲已至。')).toBeVisible();
		await expect.element(screen.getByText('虛位以待', { exact: true })).toBeVisible();
		await expect.element(screen.getByRole('table', { name: '玩家勝場排名' })).toBeVisible();
	});

	it('shows a truthful empty state and retains navigation for a role with no games', async () => {
		const screen = render(LeaderboardView, {
			leaderboard: {
				...results,
				selectedRoleId: 6,
				entries: [],
				totalPlayers: 0,
				totalGames: 0,
				totalWins: 0,
				leaderWins: 0,
				leaderCount: 0,
				leaders: [],
				lastFinishedAt: null
			}
		});
		await expect
			.element(screen.getByRole('heading', { name: '藥不然勝場榜', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('heading', { name: '此席，靜候第一位名家。', exact: true }))
			.toBeVisible();
		await expect
			.element(screen.getByRole('link', { name: '總勝場榜', exact: true }))
			.toHaveAttribute('href', '/leaderboard');
	});

	it('keeps pagination within the selected role', async () => {
		const screen = render(LeaderboardView, {
			leaderboard: { ...results, selectedRoleId: 5, page: 2, totalPages: 3 }
		});
		await expect
			.element(screen.getByRole('link', { name: '上一頁' }))
			.toHaveAttribute('href', '/leaderboard/roles/5');
		await expect
			.element(screen.getByRole('link', { name: '下一頁' }))
			.toHaveAttribute('href', '/leaderboard/roles/5?page=3');
	});
});
