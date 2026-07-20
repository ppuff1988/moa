import { describe, expect, it } from 'vitest';
import { getIdentificationVotingState, validateIdentificationVote } from '../identification-voting';

const activePlayers = [
	{ playerId: 1, roleName: '許愿' },
	{ playerId: 2, roleName: '老朝奉' },
	{ playerId: 3, roleName: '藥不然' },
	{ playerId: 4, roleName: '鄭國渠' }
];

describe('identification vote validation', () => {
	it('拒絕角色必填目標為空的投票', () => {
		const result = validateIdentificationVote('許愿', 1, {}, new Set([1, 2, 3, 4]));

		expect(result).toMatchObject({ valid: false, status: 400 });
	});

	it('拒絕沒有投票資格或提交非角色所屬票種的玩家', () => {
		expect(
			validateIdentificationVote('鄭國渠', 4, { laoChaoFeng: 2 }, new Set([1, 2, 3, 4]))
		).toMatchObject({ valid: false, status: 403 });
		expect(
			validateIdentificationVote('老朝奉', 2, { laoChaoFeng: 3 }, new Set([1, 2, 3, 4]))
		).toMatchObject({ valid: false, status: 400 });
	});

	it('拒絕跨遊戲、已離場或投給自己的目標', () => {
		expect(
			validateIdentificationVote('老朝奉', 2, { xuYuan: 99 }, new Set([1, 2, 3, 4]))
		).toMatchObject({ valid: false, status: 400 });
		expect(
			validateIdentificationVote('老朝奉', 2, { xuYuan: 2 }, new Set([1, 2, 3, 4]))
		).toMatchObject({ valid: false, status: 400 });
	});

	it('只以合資格 voter ID 的有效票判斷完成進度', () => {
		const state = getIdentificationVotingState(activePlayers, [
			{
				id: 1,
				playerId: 1,
				votedLaoChaoFeng: 2,
				votedXuYuan: null,
				votedFangZhen: null
			},
			{
				id: 2,
				playerId: 4,
				votedLaoChaoFeng: 2,
				votedXuYuan: null,
				votedFangZhen: null
			},
			{
				id: 3,
				playerId: 999,
				votedLaoChaoFeng: null,
				votedXuYuan: 1,
				votedFangZhen: null
			}
		]);

		expect(state).toMatchObject({ votedCount: 1, totalEligibleVoters: 3, allVoted: false });
		expect(state.validVotes).toHaveLength(1);
	});

	it('每位合資格玩家各有一張合法票時才允許結算', () => {
		const state = getIdentificationVotingState(activePlayers, [
			{
				id: 1,
				playerId: 1,
				votedLaoChaoFeng: 2,
				votedXuYuan: null,
				votedFangZhen: null
			},
			{
				id: 2,
				playerId: 2,
				votedLaoChaoFeng: null,
				votedXuYuan: 1,
				votedFangZhen: null
			},
			{
				id: 3,
				playerId: 3,
				votedLaoChaoFeng: null,
				votedXuYuan: null,
				votedFangZhen: 1
			}
		]);

		expect(state).toMatchObject({ votedCount: 3, totalEligibleVoters: 3, allVoted: true });
		expect(state.validVotes).toHaveLength(3);
	});
});
