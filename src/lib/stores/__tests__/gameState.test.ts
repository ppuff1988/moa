import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { createGameState } from '../gameState';

describe('gameState voting result separation', () => {
	it('私人鑑定值不會覆蓋公開投票結果', () => {
		const state = createGameState();
		state.beastHeads.set([
			{
				id: 7,
				animal: '牛',
				identifiedIsGenuine: true,
				votes: 3,
				voteRank: 2
			}
		]);
		state.publishedVotingResult.set({
			round: 1,
			firstPlace: { id: 6, animal: '鼠', votes: 5, rank: 1 },
			secondPlace: { id: 7, animal: '牛', votes: 3, rank: 2, isGenuine: false }
		});

		expect(get(state.beastHeads)[0].identifiedIsGenuine).toBe(true);
		expect(get(state.publishedVotingResult)?.secondPlace.isGenuine).toBe(false);
	});

	it('開始新回合時清除私人與公開結果', () => {
		const state = createGameState();
		state.identifiedArtifacts.set([7]);
		state.publishedVotingResult.set({
			round: 1,
			firstPlace: { id: 6, animal: '鼠', votes: 5, rank: 1 },
			secondPlace: { id: 7, animal: '牛', votes: 3, rank: 2, isGenuine: false }
		});

		state.resetForNewRound();

		expect(get(state.identifiedArtifacts)).toEqual([]);
		expect(get(state.publishedVotingResult)).toBeNull();
	});
});
