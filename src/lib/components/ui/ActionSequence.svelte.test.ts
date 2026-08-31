import { render } from 'vitest-browser-svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ActionSequence from './ActionSequence.svelte';

describe('ActionSequence round history details', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('renders the recorded player order and complete voting breakdown returned by the API', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					success: true,
					playerInfo: {
						id: 1,
						nickname: '紅',
						role: { name: '許愿', camp: 'good' }
					},
					currentRound: null,
					rounds: [
						{
							roundNumber: 1,
							phase: 'completed',
							startedAt: '2026-08-31T12:00:00.000Z',
							completedAt: '2026-08-31T12:30:00.000Z',
							myOrderIndex: 1,
							totalPlayers: 3,
							playerOrder: [
								{
									playerId: 1,
									nickname: '許愿',
									color: '紅',
									colorCode: '#EF4444',
									position: 1
								},
								{
									playerId: 2,
									nickname: '方震',
									color: '藍',
									colorCode: '#3B82F6',
									position: 2
								},
								{
									playerId: 3,
									nickname: '藥不然',
									color: '紫',
									colorCode: '#A855F7',
									position: 3
								}
							],
							votingResult: {
								firstPlace: { id: 11, animal: '龍', votes: 5, rank: 1 },
								secondPlace: {
									id: 12,
									animal: '蛇',
									votes: 4,
									rank: 2,
									isGenuine: false
								},
								artifacts: [
									{
										id: 11,
										animal: '龍',
										votes: 5,
										rank: 1,
										colorBreakdown: [
											{
												playerId: 4,
												nickname: '老朝奉',
												color: '紅',
												colorCode: '#EF4444',
												chips: 2
											}
										]
									},
									{
										id: 12,
										animal: '蛇',
										votes: 4,
										rank: 2,
										colorBreakdown: []
									},
									{
										id: 13,
										animal: '馬',
										votes: 2,
										rank: null,
										colorBreakdown: []
									},
									{
										id: 14,
										animal: '羊',
										votes: 1,
										rank: null,
										colorBreakdown: []
									}
								]
							},
							actions: [],
							isCompleted: true,
							isAttacked: false
						}
					]
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		);
		vi.stubGlobal('fetch', fetchMock);

		const screen = render(ActionSequence, { roomName: 'room / one', isOpen: true });

		await expect.element(screen.getByRole('heading', { name: '回合歷史' })).toBeVisible();
		await expect.element(screen.getByText('5 票 · 真偽未公開')).toBeVisible();
		await expect.element(screen.getByText('4 票 · 贗品')).toBeVisible();
		const completedRound = document.querySelector<HTMLElement>('.round-card.round-completed');
		expect(completedRound).not.toBeNull();
		expect(getComputedStyle(completedRound!).opacity).toBe('1');

		const orderDisclosure = document.querySelector<HTMLDetailsElement>('.player-order-disclosure');
		const chipDisclosure = document.querySelector<HTMLDetailsElement>('.chip-breakdown-disclosure');
		expect(orderDisclosure?.open).toBe(false);
		expect(chipDisclosure?.open).toBe(false);
		await expect.element(screen.getByText('藥不然')).not.toBeVisible();

		await screen.getByText('玩家行動順序').click();
		await screen.getByText('四獸首票數與籌碼明細').click();
		await expect.element(screen.getByText('藥不然')).toBeVisible();
		await expect.element(screen.getByRole('img', { name: '老朝奉的紅色籌碼 2 枚' })).toBeVisible();

		await vi.waitFor(() => {
			expect(
				Array.from(
					document.querySelectorAll('.ordered-player-name'),
					(element) => element.textContent
				)
			).toEqual(['許愿', '方震', '藥不然']);
			expect(document.querySelectorAll('.history-artifact')).toHaveLength(4);
		});

		const playerRows = Array.from(document.querySelectorAll<HTMLElement>('.player-order-list li'));
		playerRows.forEach((row) => {
			row.style.width = '600px';
		});
		const dotOffsets = playerRows.map((row) => {
			const dot = row.querySelector<HTMLElement>('.player-color-dot');
			return (dot?.getBoundingClientRect().left ?? 0) - row.getBoundingClientRect().left;
		});
		expect(Math.max(...dotOffsets) - Math.min(...dotOffsets)).toBeLessThan(1);

		expect(fetchMock).toHaveBeenCalledWith('/api/room/room%20%2F%20one/action-history', {
			credentials: 'include'
		});
	});
});
