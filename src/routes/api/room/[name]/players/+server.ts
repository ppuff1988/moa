import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom, getCurrentRound } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers, user, roles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// 獲取遊戲中的玩家列表（用於遊戲畫面左下角）
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game } = verifyResult;

	// 獲取當前最新的回合資訊
	const currentRound = await getCurrentRound(game.id);

	// 從 actionOrder 中獲取當前行動的玩家ID和已行動的玩家列表
	let currentActionPlayerId: number | null = null;
	let actionedPlayersInOrder: number[] = [];

	if (currentRound && currentRound.actionOrder) {
		const actionOrder = currentRound.actionOrder as number[];
		if (Array.isArray(actionOrder) && actionOrder.length > 0) {
			// actionOrder 的第一個玩家就是當前行動的玩家
			currentActionPlayerId = actionOrder[0];

			// actionOrder 是倒序的（最新行動的在前面），需要反轉成正序
			// 例如：[5, 3, 1] 反轉成 [1, 3, 5] 表示玩家1先行動，然後玩家3，最後玩家5
			actionedPlayersInOrder = [...actionOrder].reverse();
		}
	}

	// 獲取房間所有玩家資訊（只需要基本資訊）
	const players = await db
		.select({
			id: gamePlayers.id,
			userId: gamePlayers.userId,
			nickname: user.nickname,
			avatar: user.avatar,
			color: gamePlayers.color,
			colorCode: gamePlayers.colorCode,
			roleName: roles.name,
			isHost: gamePlayers.isHost,
			isReady: gamePlayers.isReady
		})
		.from(gamePlayers)
		.innerJoin(user, eq(gamePlayers.userId, user.id))
		.leftJoin(roles, eq(gamePlayers.roleId, roles.id))
		.where(eq(gamePlayers.gameId, game.id))
		.orderBy(gamePlayers.joinedAt); // 按加入時間排序

	// 為每個玩家添加行動狀態
	const playersWithActionStatus = players.map((player) => ({
		id: player.id,
		userId: player.userId,
		nickname: player.nickname,
		avatar: player.avatar,
		color: player.color,
		colorCode: player.colorCode,
		roleName: player.roleName,
		isHost: player.isHost,
		isReady: player.isReady,
		isCurrentAction: currentActionPlayerId === player.id,
		hasActioned: actionedPlayersInOrder.includes(player.id)
	}));

	// 構建已行動玩家的完整資訊列表（按行動順序）
	const actionedPlayers = actionedPlayersInOrder
		.map((playerId) => {
			const player = players.find((p) => p.id === playerId);
			return player
				? {
						id: player.id,
						nickname: player.nickname,
						color: player.color || '',
						colorCode: player.colorCode || '#888',
						roleName: player.roleName
					}
				: null;
		})
		.filter((p) => p !== null);

	// 構建當前行動玩家的完整資訊
	let currentActionPlayer = null;
	if (currentActionPlayerId) {
		const player = players.find((p) => p.id === currentActionPlayerId);
		if (player) {
			currentActionPlayer = {
				id: player.id,
				nickname: player.nickname,
				color: player.color || '',
				colorCode: player.colorCode || '#888',
				roleName: player.roleName
			};
		}
	}

	return json({
		players: playersWithActionStatus,
		currentRound: currentRound
			? {
					round: currentRound.round,
					phase: currentRound.phase
				}
			: null,
		actionedPlayers,
		currentActionPlayer
	});
};
