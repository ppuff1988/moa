import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	verifyPlayerInRoom,
	getCurrentRoundOrError,
	restoreCanActionIfNeeded
} from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameRounds, gamePlayers, roles } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// 前進到下一個玩家（由當前玩家手動指派）
export const POST: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player: currentPlayer } = verifyResult;

	// 解析請求體，獲取選定的下一位玩家 ID
	const body = await request.json();
	const { nextPlayerId } = body;

	if (!nextPlayerId || typeof nextPlayerId !== 'number') {
		return json(
			{
				error: '必須指定下一位玩家'
			},
			{ status: 400 }
		);
	}

	// 獲取當前回合
	const roundResult = await getCurrentRoundOrError(game.id);
	if ('error' in roundResult) {
		return roundResult.error;
	}
	const currentRound = roundResult.round;

	// 檢查是否在行動階段
	if (currentRound.phase !== 'action') {
		return json(
			{
				error: '當前階段不是行動階段'
			},
			{ status: 400 }
		);
	}

	// 驗證選定的玩家是否在遊戲中
	const [selectedPlayer] = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.id, nextPlayerId)))
		.limit(1);

	if (!selectedPlayer) {
		return json(
			{
				error: '指定的玩家不在遊戲中'
			},
			{ status: 400 }
		);
	}

	try {
		// 在指派下一位玩家之前，檢查當前玩家是否需要還原 canAction
		// 當前玩家指派下一位玩家時，代表當前玩家的行動已完成
		// 檢查是否因為攻擊而被封鎖（使用 attackedRounds）
		if (currentPlayer.canAction === false && currentPlayer.attackedRounds) {
			const attackedRounds = currentPlayer.attackedRounds as number[];

			// 如果當前回合在被攻擊回合列表中，或過去的回合被攻擊過，說明封鎖期已過
			if (
				attackedRounds.includes(currentRound.round) ||
				attackedRounds.some((round) => round < currentRound.round)
			) {
				await db
					.update(gamePlayers)
					.set({ canAction: true })
					.where(eq(gamePlayers.id, currentPlayer.id));
			}
		}

		// 檢查當前玩家是否需要還原 canAction（根據技能使用情況）
		if (currentPlayer.roleId) {
			const [currentRole] = await db
				.select()
				.from(roles)
				.where(eq(roles.id, currentPlayer.roleId))
				.limit(1);

			if (currentRole) {
				const roleSkill = currentRole.skill as Record<string, number> | null;

				// 檢查是否需要還原 can_action（行動完畢時）
				// blockedRound 只用於黃煙煙和木戶加奈的天生封鎖回合
				await restoreCanActionIfNeeded(
					currentPlayer.id,
					currentPlayer.blockedRound,
					currentPlayer.attackedRounds as number[] | null,
					currentRound.round,
					roleSkill
				);
			}
		}

		// 更新 actionOrder，將選定的玩家設為當前行動玩家
		const currentActionOrder = (currentRound.actionOrder as number[]) || [];
		const newActionOrder = [
			nextPlayerId,
			...currentActionOrder.filter((id) => id !== nextPlayerId)
		];

		await db
			.update(gameRounds)
			.set({
				actionOrder: newActionOrder
			})
			.where(eq(gameRounds.id, currentRound.id));

		// 發送 socket 事件通知所有玩家
		try {
			const { getSocketIO } = await import('$lib/server/socket');
			const io = getSocketIO();
			if (io) {
				io.to(game.roomName).emit('player-assigned', {
					nextPlayerId,
					roomName: game.roomName
				});
			}
		} catch (socketError) {
			console.error('發送 socket 事件失敗:', socketError);
		}

		return json({
			success: true,
			nextPlayerId: nextPlayerId,
			phaseChanged: false,
			newPhase: null
		});
	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : '指派下一位玩家時發生錯誤'
			},
			{ status: 500 }
		);
	}
};
