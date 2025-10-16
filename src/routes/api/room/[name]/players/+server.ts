import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom, getCurrentRound } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers, user, gameActions, roles } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// 獲取遊戲中的玩家列表（用於遊戲畫面左下角）
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game } = verifyResult;

	// 獲取當前最新的回合資訊
	const currentRound = await getCurrentRound(game.id);

	// 從 actionOrder 中獲取當前行動的玩家ID和所有行動順序
	let currentActionPlayerId: number | null = null;

	if (currentRound && currentRound.actionOrder) {
		const actionOrder = currentRound.actionOrder as number[];
		if (Array.isArray(actionOrder) && actionOrder.length > 0) {
			// actionOrder 的第一個玩家就是當前行動的玩家
			currentActionPlayerId = actionOrder[0];
		}
	}

	// 獲取本回合已經完成行動的玩家（按行動順序排列）
	let completedPlayerIds: number[] = [];
	let actionedPlayersInOrder: number[] = [];

	if (currentRound) {
		const completedActions = await db
			.select({
				playerId: gameActions.playerId,
				ordering: gameActions.ordering
			})
			.from(gameActions)
			.where(and(eq(gameActions.gameId, game.id), eq(gameActions.roundId, currentRound.id)))
			.orderBy(gameActions.ordering); // 按照行動順序排列

		completedPlayerIds = completedActions.map((action) => action.playerId);

		// 使用 Map 來確保每個玩家只出現一次，保留第一次行動的順序
		const playerOrderMap = new Map<number, number>();
		completedActions.forEach((action) => {
			if (!playerOrderMap.has(action.playerId)) {
				playerOrderMap.set(action.playerId, action.ordering);
			}
		});

		// 按照行動順序排序並提取玩家ID
		actionedPlayersInOrder = Array.from(playerOrderMap.entries())
			.sort((a, b) => a[1] - b[1])
			.map((entry) => entry[0]);
	}

	// 獲取房間所有玩家資訊（只需要基本資訊）
	const players = await db
		.select({
			id: gamePlayers.id,
			userId: gamePlayers.userId,
			nickname: user.nickname,
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
		color: player.color,
		colorCode: player.colorCode,
		roleName: player.roleName,
		isHost: player.isHost,
		isReady: player.isReady,
		isCurrentAction: currentActionPlayerId === player.id,
		hasActioned: completedPlayerIds.includes(player.id)
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
