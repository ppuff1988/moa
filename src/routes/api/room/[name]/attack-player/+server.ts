import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	verifyPlayerRole,
	getCurrentRoundOrError,
	getNextActionOrdering,
	checkPlayerCanAction
} from '$lib/server/api-helpers';
import { PERMANENT_BLOCK_ROUND } from '$lib/server/constants';
import { db } from '$lib/server/db';
import { gamePlayers, gameActions, user, roles } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// 定義受影響的玩家類型
interface AffectedPlayer {
	id: number;
	nickname: string;
}

// 定義玩家查詢結果類型
interface PlayerWithRole {
	playerId: number;
	userId: number;
	nickname: string;
	canAction: boolean | null;
	roleId: number | null;
	roleName?: string;
}

/**
 * 查詢指定玩家的完整信息（包含角色）
 */
async function getPlayerWithRole(gameId: string, playerId: number): Promise<PlayerWithRole | null> {
	const result = await db
		.select({
			playerId: gamePlayers.id,
			userId: gamePlayers.userId,
			nickname: user.nickname,
			canAction: gamePlayers.canAction,
			roleId: gamePlayers.roleId
		})
		.from(gamePlayers)
		.innerJoin(user, eq(gamePlayers.userId, user.id))
		.where(and(eq(gamePlayers.id, playerId), eq(gamePlayers.gameId, gameId)))
		.limit(1);

	return result.length > 0 ? result[0] : null;
}

/**
 * 根據角色名稱查詢玩家
 */
async function getPlayerByRoleName(
	gameId: string,
	roleName: string
): Promise<PlayerWithRole | null> {
	const result = await db
		.select({
			playerId: gamePlayers.id,
			userId: gamePlayers.userId,
			nickname: user.nickname,
			canAction: gamePlayers.canAction,
			roleId: gamePlayers.roleId,
			roleName: roles.name
		})
		.from(gamePlayers)
		.innerJoin(user, eq(gamePlayers.userId, user.id))
		.innerJoin(roles, eq(gamePlayers.roleId, roles.id))
		.where(and(eq(gamePlayers.gameId, gameId), eq(roles.name, roleName)))
		.limit(1);

	return result.length > 0 ? result[0] : null;
}

/**
 * 更新玩家的行動狀態
 */
async function disablePlayerAction(
	playerId: number,
	blockedRound?: number | null,
	isPermanentBlock: boolean = false
): Promise<void> {
	// 如果是永久封鎖（姬云浮），不設置 canAction = false，只設置 blockedRound
	const updateData: { canAction?: boolean; blockedRound?: number } = {};

	if (blockedRound !== undefined && blockedRound !== null) {
		updateData.blockedRound = blockedRound;
		console.log(`[攻擊] 設置玩家 ${playerId} 的 blockedRound 為:`, blockedRound);
	}

	// 只有非永久封鎖的情況才設置 canAction = false
	if (!isPermanentBlock) {
		updateData.canAction = false;
	}

	console.log(`[攻擊] 更新玩家 ${playerId} 的數據:`, updateData);

	await db.update(gamePlayers).set(updateData).where(eq(gamePlayers.id, playerId));

	// 驗證更新結果
	const [updated] = await db
		.select()
		.from(gamePlayers)
		.where(eq(gamePlayers.id, playerId))
		.limit(1);
	console.log(`[攻擊] 更新後玩家 ${playerId} 的狀態:`, {
		canAction: updated.canAction,
		blockedRound: updated.blockedRound
	});
}

/**
 * 檢查玩家是否已經在當前回合執行過攻擊
 */
function hasPlayerAttacked(actions: (typeof gameActions.$inferSelect)[]): boolean {
	return actions.some((action) => {
		const actionData = action.actionData as { type?: string } | null;
		return actionData?.type === 'attack_player';
	});
}

// 攻击玩家（偷袭技能）
export const POST: RequestHandler = async ({ request, params }) => {
	// 验证玩家身份和角色
	const verifyResult = await verifyPlayerRole(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player, role } = verifyResult;

	// 检查角色是否有攻击能力
	if (!role.canAttack) {
		return json(
			{
				success: false,
				message: '你没有攻击玩家的能力'
			},
			{ status: 403 }
		);
	}

	// 檢查玩家是否被封鎖（被攻擊後無法行動）
	const canActionCheck = checkPlayerCanAction(player);
	if (!canActionCheck.canAct) {
		return canActionCheck.error;
	}

	// 解析请求体
	const body = await request.json();
	const { targetPlayerId } = body;

	// 验证目标玩家ID
	if (!targetPlayerId) {
		return json(
			{
				success: false,
				message: '请指定攻擊目标'
			},
			{ status: 400 }
		);
	}

	if (targetPlayerId === player.id) {
		return json(
			{
				success: false,
				message: '不能攻擊自己'
			},
			{ status: 400 }
		);
	}

	// 获取目标玩家信息
	const targetPlayer = await getPlayerWithRole(game.id, targetPlayerId);

	if (!targetPlayer) {
		return json(
			{
				success: false,
				message: '目標玩家不存在'
			},
			{ status: 404 }
		);
	}

	// 获取目标玩家的角色详细信息
	let targetRole = null;
	if (targetPlayer.roleId) {
		const [roleData] = await db
			.select()
			.from(roles)
			.where(eq(roles.id, targetPlayer.roleId))
			.limit(1);
		targetRole = roleData;
	}

	// 获取当前回合
	const roundResult = await getCurrentRoundOrError(game.id);
	if ('error' in roundResult) {
		return roundResult.error;
	}
	const currentRound = roundResult.round;

	// 检查玩家在当前回合是否已执行过攻击
	const existingActions = await db
		.select()
		.from(gameActions)
		.where(
			and(
				eq(gameActions.gameId, game.id),
				eq(gameActions.roundId, currentRound.id),
				eq(gameActions.playerId, player.id)
			)
		);

	if (hasPlayerAttacked(existingActions)) {
		return json(
			{
				success: false,
				message: '你已經在本回合使用過攻擊了'
			},
			{ status: 400 }
		);
	}

	// 檢查目標玩家是否已經在當前回合行動過
	const targetPlayerActions = await db
		.select()
		.from(gameActions)
		.where(
			and(
				eq(gameActions.gameId, game.id),
				eq(gameActions.roundId, currentRound.id),
				eq(gameActions.playerId, targetPlayerId)
			)
		);

	const targetHasActed = targetPlayerActions.length > 0;

	// 处理攻击效果
	// 如果目标是姬云浮，设置永久封锁
	const isPermanentBlock = targetRole?.name === '姬云浮';

	// 計算封鎖回合數
	// 1. 姬云浮：永久封鎖
	// 2. 目標已行動：封鎖到下一回合 (currentRound + 1)
	// 3. 目標未行動：封鎖當前回合 (currentRound)
	let blockedRoundValue: number;
	if (isPermanentBlock) {
		blockedRoundValue = PERMANENT_BLOCK_ROUND;
		console.log('[攻擊] 目標是姬云浮，設置永久封鎖 PERMANENT_BLOCK_ROUND:', PERMANENT_BLOCK_ROUND);
	} else if (targetHasActed) {
		blockedRoundValue = currentRound.round + 1;
		console.log(`[攻擊] 目標玩家 ${targetPlayerId} 已行動，封鎖到下一回合:`, blockedRoundValue);
	} else {
		blockedRoundValue = currentRound.round;
		console.log(`[攻擊] 目標玩家 ${targetPlayerId} 未行動，封鎖當前回合:`, blockedRoundValue);
	}

	// 禁用目标玩家的行动能力
	await disablePlayerAction(targetPlayerId, blockedRoundValue, isPermanentBlock);

	// 記錄受影響的玩家（僅用於後端記錄，不返回給前端）
	const affectedPlayers: AffectedPlayer[] = [
		{ id: targetPlayerId, nickname: targetPlayer.nickname }
	];

	// 特殊處理：如果攻擊的是方震，也要禁用許愿的行動能力
	if (targetRole?.name === '方震') {
		const xuYuanPlayer = await getPlayerByRoleName(game.id, '許愿');

		if (xuYuanPlayer) {
			// 檢查許愿是否已行動
			const xuYuanActions = await db
				.select()
				.from(gameActions)
				.where(
					and(
						eq(gameActions.gameId, game.id),
						eq(gameActions.roundId, currentRound.id),
						eq(gameActions.playerId, xuYuanPlayer.playerId)
					)
				);

			const xuYuanHasActed = xuYuanActions.length > 0;
			const xuYuanBlockedRound = xuYuanHasActed ? currentRound.round + 1 : currentRound.round;

			// 許愿的封鎖邏輯與方震相同（但不對外顯示）
			await disablePlayerAction(xuYuanPlayer.playerId, xuYuanBlockedRound);
			affectedPlayers.push({
				id: xuYuanPlayer.playerId,
				nickname: xuYuanPlayer.nickname
			});
			// 移除可能洩漏身分的日誌
			console.log(`[攻擊] 方震被攻擊，連帶效果已處理`);
		}
	}

	// 計算整個回合的行動順序
	const nextOrdering = await getNextActionOrdering(game.id, currentRound.id);

	// 記錄行動到 gameActions（包含完整的 affectedPlayers 供後端使用）
	await db.insert(gameActions).values({
		gameId: game.id,
		roundId: currentRound.id,
		playerId: player.id,
		ordering: nextOrdering,
		actionData: {
			type: 'attack_player',
			targetPlayerId: targetPlayerId,
			targetPlayerNickname: targetPlayer.nickname,
			blockedRound: blockedRoundValue,
			isPermanentBlock: isPermanentBlock,
			roleName: role.name,
			round: currentRound.round,
			affectedPlayers: affectedPlayers
		}
	});

	// 構建回應消息 - 只顯示直接攻擊的目標，不洩漏連帶受影響的玩家
	const message = `成功攻擊 ${targetPlayer.nickname}`;

	return json({
		success: true,
		message: message,
		targetPlayerId: targetPlayerId,
		targetPlayerNickname: targetPlayer.nickname,
		blockedRound: blockedRoundValue,
		isPermanentBlock: isPermanentBlock
		// 移除 affectedPlayers，避免洩漏連帶受影響的玩家身分
	});
};
