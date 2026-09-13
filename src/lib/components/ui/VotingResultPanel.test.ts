import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import VotingResultPanel from './VotingResultPanel.svelte';

describe('VotingResultPanel', () => {
	it('renders the matching zodiac portrait for every detailed result card', () => {
		const { body } = render(VotingResultPanel, {
			props: {
				roomName: '404263',
				votingResult: {
					round: 2,
					artifacts: [
						{
							id: 1,
							animal: '牛',
							votes: 2,
							rank: 1,
							colorBreakdown: []
						},
						{
							id: 2,
							animal: '兔',
							votes: 1,
							rank: 2,
							colorBreakdown: []
						}
					],
					firstPlace: { id: 1, animal: '牛', votes: 2, rank: 1 },
					secondPlace: { id: 2, animal: '兔', votes: 1, rank: 2, isGenuine: false }
				}
			} as never
		});

		expect(body).toContain('src="/zodiac/zodiac_02.png"');
		expect(body).toContain('alt="牛首雕像"');
		expect(body).toContain('src="/zodiac/zodiac_04.png"');
		expect(body).toContain('alt="兔首雕像"');
	});

	it('renders settlement chips from the exact recorded player color code', () => {
		const { body } = render(VotingResultPanel, {
			props: {
				roomName: '404263',
				votingResult: {
					round: 2,
					artifacts: [
						{
							id: 1,
							animal: '龍',
							votes: 2,
							rank: 1,
							colorBreakdown: [{ color: '紅', colorCode: '#EF4444', chips: 2 }]
						}
					],
					firstPlace: { id: 1, animal: '龍', votes: 2, rank: 1 },
					secondPlace: { id: 2, animal: '蛇', votes: 0, rank: 2, isGenuine: false }
				}
			} as never
		});

		expect(body).toContain('--chip-color: #EF4444');
		expect(body).toContain('/voting-chip.png');
		expect(body).toContain('紅色');
	});

	it('shows gold and silver medals beside the top two ranked artifacts', () => {
		const { body } = render(VotingResultPanel, {
			props: {
				roomName: '404263',
				votingResult: {
					round: 2,
					artifacts: [
						{
							id: 1,
							animal: '龍',
							votes: 5,
							rank: 1,
							colorBreakdown: [{ color: '紅', colorCode: '#EF4444', chips: 5 }]
						},
						{
							id: 2,
							animal: '蛇',
							votes: 4,
							rank: 2,
							colorBreakdown: [{ color: '綠', colorCode: '#22C55E', chips: 4 }]
						}
					],
					firstPlace: { id: 1, animal: '龍', votes: 5, rank: 1 },
					secondPlace: { id: 2, animal: '蛇', votes: 4, rank: 2, isGenuine: true }
				}
			} as never
		});

		expect(body).toContain('aria-label="第一名金牌"');
		expect(body).toContain('🥇');
		expect(body).toContain('aria-label="第二名銀牌"');
		expect(body).toContain('🥈');
	});
});
