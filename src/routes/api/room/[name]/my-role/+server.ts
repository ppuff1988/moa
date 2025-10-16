import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom, getCurrentRound } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { roles, gameActions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// 獲取當前玩家的角色資訊
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;

	// 如果玩家還沒有選擇角色
	if (!player.roleId) {
		return json({
			hasRole: false,
			roleName: null,
			camp: null,
			skill: null,
			skillActions: null,
			canCheckArtifact: false,
			canAttack: false,
			canCheckPeople: false,
			canSwap: false,
			canBlock: false,
			canFool: false,
			canAction: player.canAction || true,
			performedActions: []
		});
	}

	// 獲取角色完整資訊
	const [role] = await db
		.select({
			id: roles.id,
			name: roles.name,
			camp: roles.camp,
			skill: roles.skill,
			canCheckArtifact: roles.canCheckArtifact,
			canAttack: roles.canAttack,
			canCheckPeople: roles.canCheckPeople,
			canSwap: roles.canSwap,
			canBlock: roles.canBlock,
			canFool: roles.canFool
		})
		.from(roles)
		.where(eq(roles.id, player.roleId))
		.limit(1);

	if (!role) {
		return json({
			hasRole: false,
			roleName: null,
			camp: null,
			skill: null,
			skillActions: null,
			canCheckArtifact: false,
			canAttack: false,
			canCheckPeople: false,
			canSwap: false,
			canBlock: false,
			canFool: false,
			canAction: player.canAction || true,
			performedActions: []
		});
	}

	// 解析 skill JSON 以獲取行動次數
	const skillData = (role.skill as Record<string, number>) || {};
	const skillActions = {
		checkArtifact: skillData.checkArtifact || 0, // 可以鑑定幾次寶物
		checkPeople: skillData.checkPeople || 0, // 可以鑑定幾次人
		block: skillData.block || 0, // 可以封鎖幾個獸首
		attack: skillData.attack || 0, // 可以攻擊幾位玩家
		swap: skillData.swap || 0 // 可以交換幾次
	};

	// 獲取當前回合
	const currentRound = await getCurrentRound(game.id);

	// 檢查玩家在當前回合已執行的動作
	let performedActions: Array<{ type: string; data: Record<string, unknown> }> = [];
	if (currentRound) {
		const actions = await db
			.select()
			.from(gameActions)
			.where(
				and(
					eq(gameActions.gameId, game.id),
					eq(gameActions.roundId, currentRound.id),
					eq(gameActions.playerId, player.id)
				)
			);

		performedActions = actions.map((action) => {
			const actionData = action.actionData as Record<string, unknown> | null;
			return {
				type: (actionData?.type as string) || 'unknown',
				data: actionData || {}
			};
		});
	}

	return json({
		hasRole: true,
		roleName: role.name,
		camp: role.camp,
		skill: role.skill,
		skillActions, // 新增：技能行動次數詳細資訊
		canCheckArtifact: role.canCheckArtifact || false,
		canAttack: role.canAttack || false,
		canCheckPeople: role.canCheckPeople || false,
		canSwap: role.canSwap || false,
		canBlock: role.canBlock || false,
		canFool: role.canFool || false,
		canAction: player.canAction !== undefined ? player.canAction : true,
		performedActions // 新增：當前回合已執行的動作列表
	});
};
