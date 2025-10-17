import { db } from '$lib/server/db';
import { gamePlayers, roles, user, identificationVotes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// 勝利條件常數
export const XUYUAN_WIN_SCORE = 6;

// 許愿陣營角色列表
export const XUYUAN_CAMP_ROLES = ['許愿', '黃煙煙', '方震', '木戶加奈', '姬云浮'];

// 玩家與角色資訊型別
export interface PlayerWithRole {
	playerId: number;
	userId: number;
	nickname: string;
	roleName: string | null;
	camp: string | null;
	colorCode: string | null;
}

// 鑑人結果型別
export interface IdentificationResults {
	laoChaoFeng: {
		success: boolean;
		votes: number;
		required: number;
		targetName: string;
		actualName: string;
	} | null;
	xuYuan: {
		success: boolean;
		targetName: string;
		actualName: string;
	} | null;
	fangZhen: {
		success: boolean;
		targetName: string;
		actualName: string;
	} | null;
}

/**
 * 獲取遊戲中所有玩家及其角色資訊
 */
export async function getPlayersWithRoles(gameId: string): Promise<PlayerWithRole[]> {
	return await db
		.select({
			playerId: gamePlayers.id,
			userId: gamePlayers.userId,
			nickname: user.nickname,
			roleName: roles.name,
			camp: roles.camp,
			colorCode: gamePlayers.colorCode
		})
		.from(gamePlayers)
		.leftJoin(roles, eq(gamePlayers.roleId, roles.id))
		.innerJoin(user, eq(gamePlayers.userId, user.id))
		.where(eq(gamePlayers.gameId, gameId));
}

/**
 * 計算鑑人投票結果
 */
export async function calculateIdentificationResults(
	gameId: string,
	playersWithRoles: PlayerWithRole[]
): Promise<IdentificationResults> {
	// 獲取所有投票
	const votes = await db
		.select()
		.from(identificationVotes)
		.where(eq(identificationVotes.gameId, gameId));

	// 找出各角色的玩家
	const laoChaoFengPlayer = playersWithRoles.find((p) => p.roleName === '老朝奉');
	const xuYuanPlayer = playersWithRoles.find((p) => p.roleName === '許愿');
	const fangZhenPlayer = playersWithRoles.find((p) => p.roleName === '方震');

	const results: IdentificationResults = {
		laoChaoFeng: null,
		xuYuan: null,
		fangZhen: null
	};

	// 1. 許愿陣營投票老朝奉 (需過半)
	const xuYuanCampPlayers = playersWithRoles.filter((p) =>
		XUYUAN_CAMP_ROLES.includes(p.roleName || '')
	);
	const laoChaoFengVotes = votes.filter((v) => v.votedLaoChaoFeng !== null);

	// 統計投給每個玩家的票數
	const laoChaoFengVoteCount = new Map<number, number>();
	laoChaoFengVotes.forEach((v) => {
		const targetId = v.votedLaoChaoFeng!;
		laoChaoFengVoteCount.set(targetId, (laoChaoFengVoteCount.get(targetId) || 0) + 1);
	});

	// 找出得票最多的玩家
	let maxVotes = 0;
	let mostVotedPlayerId: number | null = null;
	laoChaoFengVoteCount.forEach((count, playerId) => {
		if (count > maxVotes) {
			maxVotes = count;
			mostVotedPlayerId = playerId;
		}
	});

	const requiredVotes = Math.floor(xuYuanCampPlayers.length / 2) + 1;
	const laoChaoFengSuccess =
		mostVotedPlayerId === laoChaoFengPlayer?.playerId && maxVotes >= requiredVotes;
	const targetPlayer = mostVotedPlayerId
		? playersWithRoles.find((p) => p.playerId === mostVotedPlayerId)
		: null;

	results.laoChaoFeng = {
		success: laoChaoFengSuccess,
		votes: maxVotes,
		required: requiredVotes,
		targetName: targetPlayer?.nickname || '無',
		actualName: laoChaoFengPlayer?.nickname || '未知'
	};

	// 2. 老朝奉投票許愿
	const xuYuanVote = votes.find((v) => v.votedXuYuan !== null);
	const xuYuanSuccess = xuYuanVote && xuYuanVote.votedXuYuan === xuYuanPlayer?.playerId;
	const xuYuanTarget = xuYuanVote
		? playersWithRoles.find((p) => p.playerId === xuYuanVote.votedXuYuan)
		: null;

	results.xuYuan = {
		success: xuYuanSuccess || false,
		targetName: xuYuanTarget?.nickname || '無',
		actualName: xuYuanPlayer?.nickname || '未知'
	};

	// 3. 藥不然投票方震
	const fangZhenVote = votes.find((v) => v.votedFangZhen !== null);
	const fangZhenSuccess = fangZhenVote && fangZhenVote.votedFangZhen === fangZhenPlayer?.playerId;
	const fangZhenTarget = fangZhenVote
		? playersWithRoles.find((p) => p.playerId === fangZhenVote.votedFangZhen)
		: null;

	results.fangZhen = {
		success: fangZhenSuccess || false,
		targetName: fangZhenTarget?.nickname || '無',
		actualName: fangZhenPlayer?.nickname || '未知'
	};

	return results;
}

/**
 * 計算鑑人階段的額外得分
 */
export function calculateIdentificationScore(
	identificationResults: IdentificationResults,
	hasYaoburan: boolean
): number {
	let score = 0;

	// 許愿陣營找出老朝奉 → +1 分
	if (identificationResults.laoChaoFeng?.success) {
		score += 1;
	}

	// 老朝奉沒找出許愿 → 許愿陣營 +2 分
	if (!identificationResults.xuYuan?.success) {
		score += 2;
	}

	// 藥不然沒找出方震 → 許愿陣營 +1 分
	if (hasYaoburan && !identificationResults.fangZhen?.success) {
		score += 1;
	}

	return score;
}

/**
 * 決定獲勝陣營
 */
export function determineWinner(xuYuanScore: number): string {
	return xuYuanScore >= XUYUAN_WIN_SCORE ? '許愿陣營' : '老朝奉陣營';
}
