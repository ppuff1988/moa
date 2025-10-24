import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	verifyPlayerRole,
	getCurrentRoundOrError,
	getNextActionOrdering
} from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameArtifacts, gameActions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// ===== 類型定義 =====
type BlockReason = 'player_blocked' | 'role_blocked' | 'artifact_blocked';

interface IdentifyActionData {
	type: string;
	artifactName: string;
	artifactId: number;
	result?: boolean;
	blocked?: boolean;
	reason?: BlockReason | null;
	roleName: string;
}

interface IdentifyResult {
	artifactName: string;
	isGenuine: boolean;
}

// ===== 工具函數 =====
/**
 * 獲取完整的獸首名稱
 */
function getArtifactFullName(animalName: string): string {
	return `${animalName}首`;
}

/**
 * 檢查玩家是否在當前回合被封鎖
 */
function isPlayerBlockedInRound(
	player: { canAction: boolean | null; blockedRound: number | null },
	currentRound: number
): BlockReason | null {
	// 優先級：玩家被攻擊封鎖 > 角色回合封鎖
	if (player.canAction === false) {
		return 'player_blocked';
	}

	if (player.blockedRound !== null) {
		// 當前回合被封鎖（黃煙煙、木戶加奈的天生封鎖回合）
		if (player.blockedRound === currentRound) {
			return 'role_blocked';
		}
	}

	return null;
}

/**
 * 計算鑑定結果
 */
function calculateIdentificationResult(
	role: { camp: string; canFool?: boolean | null },
	artifact: { isGenuine: boolean; isSwapped: boolean | null }
): boolean {
	// 壞人陣營或不能被迷惑的角色：永遠看到真實結果
	if (role.camp !== 'good' || !role.canFool) {
		return artifact.isGenuine;
	}

	// 好人陣營且能被迷惑：受交換影響
	return artifact.isSwapped ? !artifact.isGenuine : artifact.isGenuine;
}

/**
 * 分析玩家的歷史行動
 */
function analyzePlayerActions(
	existingActions: Array<{ actionData: unknown }>,
	targetArtifactName: string
): {
	identifyCount: number;
	alreadyIdentifiedThis: boolean;
	previousResult: IdentifyResult | null;
} {
	let identifyCount = 0;
	let alreadyIdentifiedThis = false;
	let previousResult: IdentifyResult | null = null;

	for (const action of existingActions) {
		const actionData = action.actionData as Partial<IdentifyActionData> | null;

		if (actionData?.type === 'identify_artifact') {
			identifyCount++;

			if (actionData.artifactName === targetArtifactName) {
				alreadyIdentifiedThis = true;
				// 只記錄成功的鑑定結果
				if (!actionData.blocked && actionData.result !== undefined) {
					previousResult = {
						artifactName: actionData.artifactName,
						isGenuine: actionData.result
					};
				}
			}
		}
	}

	return { identifyCount, alreadyIdentifiedThis, previousResult };
}

// 記錄被封鎖的鑑定行動
async function recordBlockedAction(
	gameId: string,
	roundId: number,
	playerId: number,
	ordering: number,
	artifactName: string,
	artifactId: number,
	reason: BlockReason,
	roleName: string
) {
	await db.insert(gameActions).values({
		gameId,
		roundId,
		playerId,
		ordering,
		actionData: {
			type: 'identify_artifact',
			artifactName,
			artifactId,
			blocked: true,
			reason,
			roleName
		} satisfies IdentifyActionData
	});
}

/**
 * 記錄成功的鑑定動作
 */
async function recordSuccessfulAction(
	gameId: string,
	roundId: number,
	playerId: number,
	ordering: number,
	artifactName: string,
	artifactId: number,
	result: boolean,
	roleName: string
) {
	await db.insert(gameActions).values({
		gameId,
		roundId,
		playerId,
		ordering,
		actionData: {
			type: 'identify_artifact',
			artifactName,
			artifactId,
			result,
			roleName
		} satisfies Omit<IdentifyActionData, 'blocked' | 'reason'>
	});
}

// ===== 主處理函數 =====
export const POST: RequestHandler = async ({ request, params }) => {
	// 1. 驗證玩家身份
	const verifyResult = await verifyPlayerRole(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}
	const { game, player, role } = verifyResult;

	// 2. 移除提前的封鎖檢查，讓被攻擊的玩家也能記錄 action log
	// 檢查玩家是否被封鎖的邏輯移到後面統一處理

	// 3. 獲取當前回合
	const roundResult = await getCurrentRoundOrError(game.id);
	if ('error' in roundResult) {
		return roundResult.error;
	}
	const currentRound = roundResult.round;

	// 4. 解析請求參數
	const body = await request.json();
	const { artifactName } = body;

	if (!artifactName) {
		return json(
			{
				success: false,
				message: '請提供獸首名稱'
			},
			{ status: 400 }
		);
	}

	const animalName = artifactName.replace('首', '');
	const fullArtifactName = getArtifactFullName(animalName);

	// 5. 查詢目標獸首
	const [artifact] = await db
		.select()
		.from(gameArtifacts)
		.where(
			and(
				eq(gameArtifacts.gameId, game.id),
				eq(gameArtifacts.round, currentRound.round),
				eq(gameArtifacts.animal, animalName)
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

	// 6. 查詢本回合已執行的動作
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

	// 7. 分析歷史行動
	const { identifyCount, alreadyIdentifiedThis, previousResult } = analyzePlayerActions(
		existingActions,
		fullArtifactName
	);

	// 8. 處理重複鑑定
	if (alreadyIdentifiedThis) {
		if (previousResult) {
			// 已成功鑑定過，返回之前的結果
			return json({
				success: true,
				message: '你已經鑑定過這個獸首了',
				alreadyIdentified: true,
				result: previousResult
			});
		}
		// 已嘗試但被封鎖，不允許再次嘗試同一個目標
		return json(
			{
				success: false,
				message: '無法鑑定',
				blocked: true
			},
			{ status: 403 }
		);
	}

	// 9. 檢查鑑定次數上限
	const skillData = role.skill as Record<string, number> | null;
	const maxCheckArtifact = skillData?.checkArtifact || 0;

	if (identifyCount >= maxCheckArtifact) {
		return json(
			{
				success: false,
				message: '你已經用完所有鑑定次數'
			},
			{ status: 400 }
		);
	}

	// 10. 檢查封鎖狀態
	const nextOrdering = await getNextActionOrdering(game.id, currentRound.id);

	// 10.1 先檢查執行者自己是否被攻擊而無法行動
	// 特別處理：姬云浮被攻擊後永遠無法鑑定獸首
	const executorAttackedRounds = (player.attackedRounds as number[]) || [];
	const isExecutorJiYunfu = role.name === '姬云浮';
	const isExecutorPermanentlyBlocked = isExecutorJiYunfu && executorAttackedRounds.length > 0;

	let blockReason = isPlayerBlockedInRound(player, currentRound.round);

	// 如果是姬云浮且曾被攻擊，覆蓋為永久封鎖
	if (isExecutorPermanentlyBlocked) {
		blockReason = 'player_blocked'; // 使用 player_blocked 但記錄時會特別標註
	}

	// 只有在玩家自身沒有被封鎖的情況下，才檢查獸首是否被封鎖
	if (!blockReason && artifact.isBlocked) {
		blockReason = 'artifact_blocked';
	}

	// 11. 處理封鎖情況
	if (blockReason) {
		await recordBlockedAction(
			game.id,
			currentRound.id,
			player.id,
			nextOrdering,
			fullArtifactName,
			artifact.id,
			blockReason,
			role.name
		);

		const errorMessage = isExecutorPermanentlyBlocked
			? '姬云浮被攻擊後永久無法鑑定獸首'
			: '無法鑑定';

		return json(
			{
				success: false,
				message: errorMessage,
				blocked: true,
				actionRecorded: true
			},
			{ status: 403 }
		);
	}

	// 12. 計算鑑定結果
	const identificationResult = calculateIdentificationResult(role, artifact);

	// 13. 記錄成功的鑑定動作
	await recordSuccessfulAction(
		game.id,
		currentRound.id,
		player.id,
		nextOrdering,
		fullArtifactName,
		artifact.id,
		identificationResult,
		role.name
	);

	return json({
		success: true,
		message: '鑑定完成',
		result: {
			artifactName: fullArtifactName,
			isGenuine: identificationResult
		}
	});
};
