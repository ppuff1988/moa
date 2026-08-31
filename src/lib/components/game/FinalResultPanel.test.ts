import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import FinalResultPanel from './FinalResultPanel.svelte';

describe('FinalResultPanel settlement hierarchy', () => {
	it('presents the final score, selected artifacts, vote details, and player colors clearly', () => {
		const { body } = render(FinalResultPanel, {
			props: {
				winner: '許愿陣營',
				xuYuanScore: 7,
				allArtifacts: [
					{ id: 1, round: 1, voteRank: 1, isGenuine: false, animal: '猴' },
					{ id: 2, round: 1, voteRank: 2, isGenuine: true, animal: '狗' }
				],
				players: [
					{
						id: 1,
						nickname: '許愿玩家',
						roleName: '許愿',
						camp: 'good',
						colorCode: '#EF4444'
					},
					{
						id: 2,
						nickname: '老朝奉玩家',
						roleName: '老朝奉',
						camp: 'bad',
						colorCode: '#1F2937'
					}
				],
				identificationResults: {
					laoChaoFeng: {
						success: false,
						targetName: '藥不然',
						actualName: '木戶加奈',
						votes: 2,
						required: 3,
						voteDetails: [
							{
								voterName: '許愿玩家',
								voterRole: '許愿',
								votedFor: '藥不然',
								votedForRole: '木戶加奈',
								voterColorCode: '#EF4444',
								votedColorCode: '#1F2937'
							}
						]
					}
				}
			} as never
		});

		expect(body).toContain('aria-labelledby="settlement-title"');
		expect(body).toContain('role="progressbar"');
		expect(body).toContain('aria-valuenow="7"');
		expect(body).toContain('src="/zodiac/zodiac_09.png"');
		expect(body).toContain('alt="猴首雕像"');
		expect(body).toContain('aria-label="第 1 名"');
		expect(body).toContain('<details class="vote-disclosure');
		expect(body).toContain('--player-color: #EF4444');
		expect(body).toContain('data-faction-color="red"');
		expect(body).toContain('data-faction-color="black"');
		expect(body).toContain('紅方');
		expect(body).toContain('黑方');
		expect(body).toContain('👼');
		expect(body).toContain('😈');
		expect(body).not.toContain('>藏<');
		expect(body).not.toContain('獲勝！');
	});
});
