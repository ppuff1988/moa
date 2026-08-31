import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getNextActionOrdering, runCurrentActionTransaction } from '$lib/server/api-helpers';
import { gameArtifacts, gameActions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// 交換真偽（老朝奉技能）
export const POST: RequestHandler = async ({ request, params }) => {
	const result = await runCurrentActionTransaction(
		request,
		params.name!,
		async ({ transaction: db, game, player, role, currentRound }) => {
			// 檢查角色是否有交換真偽的能力
			if (!role.canSwap) {
				return json(
					{
						success: false,
						message: '你沒有交換真偽的能力'
					},
					{ status: 403 }
				);
			}

			// 檢查玩家在當前回合是否已執行過交換真偽
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

			// 檢查是否已經使用過交換真偽
			const hasSwapped = existingActions.some((action) => {
				const actionData = action.actionData as { type?: string } | null;
				return actionData?.type === 'swap_artifacts';
			});

			if (hasSwapped) {
				return json(
					{
						success: false,
						message: '你已經在本回合使用過交換真偽了'
					},
					{ status: 400 }
				);
			}

			// 檢查執行者是否被攻擊而無法行動
			if (player.canAction === false) {
				// 計算行動順序
				const nextOrdering = await getNextActionOrdering(game.id, currentRound.id, db);

				// 記錄被封鎖的交換動作
				await db.insert(gameActions).values({
					gameId: game.id,
					roundId: currentRound.id,
					playerId: player.id,
					ordering: nextOrdering,
					actionData: {
						type: 'swap_artifacts',
						blocked: true,
						reason: 'player_blocked',
						roleName: role.name,
						round: currentRound.round
					}
				});

				return json(
					{
						success: false,
						message: '你被攻擊了，無法執行交換真偽',
						blocked: true,
						actionRecorded: true
					},
					{ status: 403 }
				);
			}

			// 獲取當前回合的所有獸首
			const artifacts = await db
				.select()
				.from(gameArtifacts)
				.where(and(eq(gameArtifacts.gameId, game.id), eq(gameArtifacts.round, currentRound.round)));

			// 檢查獸首數量是否為4個
			if (artifacts.length !== 4) {
				return json(
					{
						success: false,
						message: '當前回合獸首數量不正確'
					},
					{ status: 400 }
				);
			}

			// 將所有4個獸首的 isSwapped 設為 true
			const swappedArtifactIds: number[] = [];
			const swappedArtifactNames: string[] = [];

			for (const artifact of artifacts) {
				await db
					.update(gameArtifacts)
					.set({ isSwapped: true })
					.where(eq(gameArtifacts.id, artifact.id));

				swappedArtifactIds.push(artifact.id);
				swappedArtifactNames.push(`${artifact.animal}首`);
			}

			// 計算整個回合的行動順序
			const nextOrdering = await getNextActionOrdering(game.id, currentRound.id, db);

			// 記錄行動到 gameActions
			await db.insert(gameActions).values({
				gameId: game.id,
				roundId: currentRound.id,
				playerId: player.id,
				ordering: nextOrdering,
				actionData: {
					type: 'swap_artifacts',
					artifactIds: swappedArtifactIds,
					artifactNames: swappedArtifactNames,
					roleName: role.name,
					round: currentRound.round
				}
			});

			return json({
				success: true,
				message: '交換真偽完成',
				swappedArtifacts: swappedArtifactNames
			});
		}
	);

	return 'error' in result ? result.error : result.data;
};
