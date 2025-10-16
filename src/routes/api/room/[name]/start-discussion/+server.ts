import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	verifyPlayerInRoomWithStatus,
	getCurrentRoundOrError,
	restoreCanActionIfNeeded
} from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameRounds, gamePlayers, roles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyPlayerInRoomWithStatus(request, params.name!, 'playing');
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game } = verifyResult;

		// 獲取當前回合
		const roundResult = await getCurrentRoundOrError(game.id);
		if ('error' in roundResult) {
			return roundResult.error;
		}
		const currentRound = roundResult.round;

		// 檢查當前階段是否為行動階段
		if (currentRound.phase !== 'action') {
			return json({ message: '當前不在行動階段' }, { status: 400 });
		}

		// 在進入討論階段之前，處理當前行動玩家的 can_action 還原
		// 這是為了處理最後一個行動玩家的情況，因為他們不會指派下一位玩家
		const actionOrder = (currentRound.actionOrder as number[]) || [];
		if (actionOrder.length > 0) {
			const currentActionPlayerId = actionOrder[0];

			// 獲取當前行動玩家的資訊
			const [currentActionPlayer] = await db
				.select()
				.from(gamePlayers)
				.where(eq(gamePlayers.id, currentActionPlayerId))
				.limit(1);

			if (currentActionPlayer) {
				// 檢查是否需要還原 canAction（處理被封鎖的情況）
				if (currentActionPlayer.canAction === false && currentActionPlayer.blockedRound !== null) {
					if (currentActionPlayer.blockedRound == currentRound.round) {
						await db
							.update(gamePlayers)
							.set({ canAction: true })
							.where(eq(gamePlayers.id, currentActionPlayer.id));
					}
				}

				// 檢查當前玩家是否需要還原 canAction（根據技能使用情況）
				if (currentActionPlayer.roleId) {
					const [currentRole] = await db
						.select()
						.from(roles)
						.where(eq(roles.id, currentActionPlayer.roleId))
						.limit(1);

					if (currentRole) {
						const roleSkill = currentRole.skill as Record<string, number> | null;

						// 檢查是否需要還原 can_action（行動完畢時）
						await restoreCanActionIfNeeded(
							currentActionPlayer.id,
							currentActionPlayer.blockedRound,
							currentRound.round,
							roleSkill
						);
					}
				}
			}
		}

		// 更新回合階段為討論
		await db
			.update(gameRounds)
			.set({
				phase: 'discussion'
				// 移除 actionOrder: [] - 保留行動順序以便前端顯示
			})
			.where(eq(gameRounds.id, currentRound.id));

		return json({
			success: true,
			message: '已進入討論階段',
			roundId: currentRound.id
		});
	} catch (error) {
		console.error('進入討論階段時發生錯誤:', error);
		const message = error instanceof Error ? error.message : '進入討論階段失敗';
		return json({ message }, { status: 400 });
	}
};
