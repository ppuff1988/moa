import { describe, expect, it } from 'vitest';
import { buildPublishedVotingResult } from '../game-voting';
import * as gameVoting from '../game-voting';

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

	it('建立包含四個獸首、入選名次與玩家籌碼的歷史結果', () => {
		const buildRoundVotingHistory = (
			gameVoting as unknown as {
				buildRoundVotingHistory?: (
					round: number,
					artifacts: Array<{
						id: number;
						animal: string;
						votes: number | null;
						voteRank: number | null;
						isGenuine: boolean;
					}>,
					allocations: Array<{
						artifactId: number;
						playerId: number;
						nickname: string;
						color: string | null;
						colorCode: string | null;
						chips: number;
					}>
				) => unknown;
			}
		).buildRoundVotingHistory;

		expect(buildRoundVotingHistory).toBeTypeOf('function');
		expect(
			buildRoundVotingHistory?.(
				2,
				[
					{ id: 3, animal: '馬', votes: 2, voteRank: null, isGenuine: true },
					{ id: 1, animal: '龍', votes: 5, voteRank: 1, isGenuine: true },
					{ id: 2, animal: '蛇', votes: 4, voteRank: 2, isGenuine: false }
				],
				[
					{
						artifactId: 1,
						playerId: 8,
						nickname: '老朝奉',
						color: '紅',
						colorCode: '#EF4444',
						chips: 3
					}
				]
			)
		).toEqual({
			round: 2,
			firstPlace: { id: 1, animal: '龍', votes: 5, rank: 1 },
			secondPlace: { id: 2, animal: '蛇', votes: 4, rank: 2, isGenuine: false },
			artifacts: [
				{
					id: 1,
					animal: '龍',
					votes: 5,
					rank: 1,
					colorBreakdown: [
						{
							playerId: 8,
							nickname: '老朝奉',
							color: '紅',
							colorCode: '#EF4444',
							chips: 3
						}
					]
				},
				{ id: 2, animal: '蛇', votes: 4, rank: 2, colorBreakdown: [] },
				{ id: 3, animal: '馬', votes: 2, rank: null, colorBreakdown: [] }
			]
		});
	});
});
