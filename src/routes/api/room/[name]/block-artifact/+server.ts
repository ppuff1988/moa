import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	verifyPlayerRole,
	getCurrentRoundOrError,
	getNextActionOrdering,
	checkPlayerCanAction,
	countActionsByType
} from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameArtifacts, gameActions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// 封鎖獸首（鄭國渠技能）
export const POST: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerRole(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player, role } = verifyResult;

	// 檢查角色是否有封鎖獸首的能力
	if (!role.canBlock) {
		return json(
			{
				success: false,
				message: '你沒有封鎖獸首的能力'
			},
			{ status: 403 }
		);
	}

	// 檢查玩家是否被封鎖（被攻擊後無法行動）
	const canActionCheck = checkPlayerCanAction(player);
	if (!canActionCheck.canAct) {
		return canActionCheck.error;
	}

	// 獲取當前回合
	const roundResult = await getCurrentRoundOrError(game.id);
	if ('error' in roundResult) {
		return roundResult.error;
	}
	const currentRound = roundResult.round;

	// 解析請求參數
	const body = await request.json();
	const { artifactId } = body;

	if (!artifactId) {
		return json(
			{
				success: false,
				message: '請提供要封鎖的獸首ID'
			},
			{ status: 400 }
		);
	}

	// 查詢目標獸首
	const [artifact] = await db
		.select()
		.from(gameArtifacts)
		.where(
			and(
				eq(gameArtifacts.gameId, game.id),
				eq(gameArtifacts.round, currentRound.round),
				eq(gameArtifacts.id, artifactId)
			)
		)
		.limit(1);

	if (!artifact) {
		return json(
			{
				success: false,
				message: '找不到該獸首'
			},
			{ status: 404 }
		);
	}

	// 檢查獸首是否已被封鎖
	if (artifact.isBlocked) {
		return json(
			{
				success: false,
				message: '該獸首已經被封鎖了'
			},
			{ status: 400 }
		);
	}

	// 檢查玩家在當前回合是否已執行過封鎖動作
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

	// 使用 helper 函數統計已使用的封鎖次數
	const blockCount = countActionsByType(existingActions, 'block_artifact');

	// 檢查封鎖次數上限
	const skillData = role.skill as Record<string, number> | null;
	const maxBlock = skillData?.block || 0;

	if (blockCount >= maxBlock) {
		return json(
			{
				success: false,
				message: '你已經用完所有封鎖次數'
			},
			{ status: 400 }
		);
	}

	// 將獸首的 isBlocked 設為 true
	await db.update(gameArtifacts).set({ isBlocked: true }).where(eq(gameArtifacts.id, artifactId));

	// 計算整個回合的行動順序
	const nextOrdering = await getNextActionOrdering(game.id, currentRound.id);

	// 記錄行動到 gameActions
	await db.insert(gameActions).values({
		gameId: game.id,
		roundId: currentRound.id,
		playerId: player.id,
		ordering: nextOrdering,
		actionData: {
			type: 'block_artifact',
			artifactId: artifact.id,
			artifactName: `${artifact.animal}首`,
			roleName: role.name,
			round: currentRound.round
		}
	});

	return json({
		success: true,
		message: `成功封鎖 ${artifact.animal}首`,
		artifact: {
			id: artifact.id,
			animal: artifact.animal,
			isBlocked: true
		}
	});
};
