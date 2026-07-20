import { describe, expect, it } from 'vitest';
import { buildPublishedVotingResult } from '../game-voting';

describe('buildPublishedVotingResult', () => {
	it('只使用持久化排名建立一致的公開結果', () => {
		const result = buildPublishedVotingResult(2, [
			{ id: 12, animal: '虎', votes: 3, voteRank: 2, isGenuine: false },
			{ id: 11, animal: '牛', votes: 5, voteRank: 1, isGenuine: true }
		]);

		expect(result).toEqual({
			round: 2,
			firstPlace: { id: 11, animal: '牛', votes: 5, rank: 1 },
			secondPlace: { id: 12, animal: '虎', votes: 3, rank: 2, isGenuine: false }
		});
	});

	it('缺少任一名次時拒絕建立假結果', () => {
		const result = buildPublishedVotingResult(1, [
			{ id: 11, animal: '牛', votes: 5, voteRank: 1, isGenuine: true }
		]);

		expect(result).toBeNull();
	});
});
