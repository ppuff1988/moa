import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	verifyPlayerRole,
	getCurrentRoundOrError,
	getNextActionOrdering
} from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers, gameActions, roles, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// 鑑定玩家陣營（方震技能）
export const POST: RequestHandler = async ({ request, params }) => {
	// ===== 1. 驗證玩家身份 =====
	const verifyResult = await verifyPlayerRole(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}
	const { game, player, role } = verifyResult;

	// ===== 2. 移除提前的封鎖檢查，讓被攻擊的玩家也能記錄 action log =====
	// 檢查玩家是否被封鎖的邏輯移到後面統一處理

	// ===== 3. 檢查角色能力 =====
	if (!role.canCheckPeople) {
		return json(
			{
				success: false,
				message: '你沒有鑑定玩家的能力'
			},
			{ status: 403 }
		);
	}

	// ===== 4. 解析請求參數 =====
	const body = await request.json();
	const { targetPlayerId } = body;

	if (!targetPlayerId) {
		return json(
			{
				success: false,
				message: '請指定鑑定目標'
			},
			{ status: 400 }
		);
	}

	if (targetPlayerId === player.id) {
		return json(
			{
				success: false,
				message: '不能鑑定自己'
			},
			{ status: 400 }
		);
	}

	// ===== 5. 查詢目標玩家資訊 =====
	const targetPlayerData = await db
		.select({
			playerId: gamePlayers.id,
			userId: gamePlayers.userId,
			nickname: user.nickname,
			roleId: gamePlayers.roleId,
			canAction: gamePlayers.canAction,
			blockedRound: gamePlayers.blockedRound,
			attackedRounds: gamePlayers.attackedRounds
		})
		.from(gamePlayers)
		.innerJoin(user, eq(gamePlayers.userId, user.id))
		.where(and(eq(gamePlayers.id, targetPlayerId), eq(gamePlayers.gameId, game.id)))
		.limit(1);

	if (!targetPlayerData || targetPlayerData.length === 0) {
		return json(
			{
				success: false,
				message: '目標玩家不存在'
			},
			{ status: 404 }
		);
	}

	const targetPlayer = targetPlayerData[0];

	if (!targetPlayer.roleId) {
		return json(
			{
				success: false,
				message: '目標玩家還沒有選擇角色'
			},
			{ status: 400 }
		);
	}

	// ===== 6. 查詢目標玩家角色 =====
	const [targetRole] = await db
		.select()
		.from(roles)
		.where(eq(roles.id, targetPlayer.roleId))
		.limit(1);

	if (!targetRole) {
		return json(
			{
				success: false,
				message: '找不到目標玩家的角色信息'
			},
			{ status: 404 }
		);
	}

	// ===== 7. 獲取當前回合 =====
	const roundResult = await getCurrentRoundOrError(game.id);
	if ('error' in roundResult) {
		return roundResult.error;
	}
	const currentRound = roundResult.round;

	// ===== 8. 查詢本回合已執行的動作 =====
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

	// ===== 9. 統計鑑定次數與檢查重複鑑定 =====
	let identifyCount = 0;
	let alreadyIdentifiedThis = false;
	let previousResult: {
		targetPlayerId: number;
		targetPlayerNickname: string;
		camp: string;
	} | null = null;

	for (const action of existingActions) {
		const actionData = action.actionData as {
			type?: string;
			targetPlayerId?: number;
			camp?: string;
			blocked?: boolean;
		} | null;

		if (actionData?.type === 'identify_player') {
			identifyCount++;

			if (actionData.targetPlayerId === targetPlayerId) {
				alreadyIdentifiedThis = true;
				// 只記錄成功的鑑定結果
				if (!actionData.blocked && actionData.camp) {
					previousResult = {
						targetPlayerId: targetPlayerId,
						targetPlayerNickname: targetPlayer.nickname,
						camp: actionData.camp
					};
				}
			}
		}
	}

	// ===== 10. 處理重複鑑定 =====
	// 10.1 已成功鑑定過，返回之前的結果
	if (alreadyIdentifiedThis && previousResult) {
		return json(
			{
				success: true,
				message: '你已經鑑定過這個玩家了',
				alreadyIdentified: true,
				result: previousResult
			},
			{ status: 200 }
		);
	}

	// 10.2 已嘗試但被封鎖，不允許再次嘗試同一個目標
	if (alreadyIdentifiedThis && !previousResult) {
		return json(
			{
				success: false,
				message: '你已經嘗試鑑定過這個玩家了',
				blocked: true
			},
			{ status: 400 }
		);
	}

	// ===== 11. 檢查鑑定次數上限 =====
	const skillData = role.skill as Record<string, number> | null;
	const maxCheckPeople = skillData?.checkPeople || 0;

	if (identifyCount >= maxCheckPeople) {
		return json(
			{
				success: false,
				message: '你已經用完所有鑑定次數'
			},
			{ status: 400 }
		);
	}

	// ===== 12. 檢查封鎖狀態 =====
	// 計算整個回合的行動順序
	const nextOrdering = await getNextActionOrdering(game.id, currentRound.id);

	// 12.1 先檢查執行鑑定的玩家自己是否被攻擊而無法行動
	const executorBlockReason = player.canAction === false ? 'player_blocked' : null;

	if (executorBlockReason) {
		// 記錄被封鎖的鑑定動作
		await db.insert(gameActions).values({
			gameId: game.id,
			roundId: currentRound.id,
			playerId: player.id,
			ordering: nextOrdering,
			actionData: {
				type: 'identify_player',
				targetPlayerId: targetPlayerId,
				targetPlayerNickname: targetPlayer.nickname,
				blocked: true,
				reason: executorBlockReason,
				roleName: role.name,
				round: currentRound.round
			}
		});

		return json(
			{
				success: false,
				message: '你被攻擊了，無法執行鑑定',
				blocked: true,
				actionRecorded: true
			},
			{ status: 403 }
		);
	}

	// 12.2 檢查目標玩家是否被封鎖
	// 檢查目標玩家是否被封鎖
	// 1. 如果是姬云浮且 attackedRounds 有任何值，永久無法被鑑定
	// 2. 檢查是否因被攻擊而無法被鑑定（attackedRounds 包含當前回合）
	// 3. 檢查是否因天生技能而無法被鑑定（blockedRound 等於當前回合）

	// 查詢目標玩家的角色資訊以判斷是否為姬云浮
	const targetAttackedRounds = (targetPlayer.attackedRounds as number[]) || [];
	const isJiYunfu = targetRole.name === '姬云浮';

	// 姬云浮的永久封鎖：只要 attackedRounds 有值就永久無法被鑑定
	const isPermanentlyBlocked = isJiYunfu && targetAttackedRounds.length > 0;
	const isAttackedThisRound = targetAttackedRounds.includes(currentRound.round);
	const isNaturallyBlocked = targetPlayer.blockedRound === currentRound.round;

	const isBlocked = isPermanentlyBlocked || isAttackedThisRound || isNaturallyBlocked;

	// ===== 13. 處理封鎖情況 =====
	if (isBlocked) {
		// 確定封鎖原因
		let blockReason = 'player_blocked';
		if (isPermanentlyBlocked) {
			blockReason = 'permanently_blocked'; // 姬云浮被攻擊後永久無法被鑑定
		} else if (isAttackedThisRound) {
			blockReason = 'attacked_this_round'; // 本回合被攻擊
		} else if (isNaturallyBlocked) {
			blockReason = 'naturally_blocked'; // 黃煙煙或木戶加奈的天生封鎖回合
		}

		// 記錄失敗的鑑定動作（消耗次數）
		await db.insert(gameActions).values({
			gameId: game.id,
			roundId: currentRound.id,
			playerId: player.id,
			ordering: nextOrdering,
			actionData: {
				type: 'identify_player',
				targetPlayerId: targetPlayerId,
				targetPlayerNickname: targetPlayer.nickname,
				blocked: true,
				reason: blockReason,
				roleName: role.name,
				round: currentRound.round
			}
		});

		return json(
			{
				success: false,
				message: '無法鑑定',
				blocked: true,
				actionRecorded: true
			},
			{ status: 403 }
		);
	}

	// ===== 14. 獲取鑑定結果（目標玩家的真實陣營）=====
	const targetCamp = targetRole.camp;

	// ===== 15. 記錄成功的鑑定動作 =====
	await db.insert(gameActions).values({
		gameId: game.id,
		roundId: currentRound.id,
		playerId: player.id,
		ordering: nextOrdering,
		actionData: {
			type: 'identify_player',
			targetPlayerId: targetPlayerId,
			targetPlayerNickname: targetPlayer.nickname,
			camp: targetCamp,
			roleName: role.name,
			round: currentRound.round
		}
	});

	return json({
		success: true,
		message: '鑑定完成',
		result: {
			targetPlayerId: targetPlayerId,
			targetPlayerNickname: targetPlayer.nickname,
			camp: targetCamp
		}
	});
};
