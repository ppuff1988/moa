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

	// ===== 2. 檢查角色能力 =====
	if (!role.canCheckPeople) {
		return json(
			{
				success: false,
				message: '你沒有鑑定玩家的能力'
			},
			{ status: 403 }
		);
	}

	// ===== 3. 解析請求參數 =====
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

	// ===== 4. 查詢目標玩家資訊 =====
	const targetPlayerData = await db
		.select({
			playerId: gamePlayers.id,
			userId: gamePlayers.userId,
			nickname: user.nickname,
			roleId: gamePlayers.roleId,
			canAction: gamePlayers.canAction,
			blockedRound: gamePlayers.blockedRound
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

	// ===== 5. 查詢目標玩家角色 =====
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

	// ===== 6. 獲取當前回合 =====
	const roundResult = await getCurrentRoundOrError(game.id);
	if ('error' in roundResult) {
		return roundResult.error;
	}
	const currentRound = roundResult.round;

	// ===== 7. 查詢本回合已執行的動作 =====
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

	// ===== 8. 統計鑑定次數與檢查重複鑑定 =====
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

	// ===== 9. 處理重複鑑定 =====
	// 9.1 已成功鑑定過，返回之前的結果
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

	// 9.2 已嘗試但被封鎖，不允許再次嘗試同一個目標
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

	// ===== 10. 檢查鑑定次數上限 =====
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

	// ===== 11. 檢查封鎖狀態 =====
	// 計算整個回合的行動順序
	const nextOrdering = await getNextActionOrdering(game.id, currentRound.id);
	const isBlocked = !player.canAction;

	// ===== 12. 處理封鎖情況 =====
	if (isBlocked) {
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
				reason: 'player_blocked',
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

	// ===== 13. 獲取鑑定結果（目標玩家的真實陣營）=====
	const targetCamp = targetRole.camp;

	// ===== 14. 記錄成功的鑑定動作 =====
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
