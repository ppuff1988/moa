import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers, games } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getGameState } from '$lib/server/game';
import { getSocketIO } from '$lib/server/socket';

export const PATCH: RequestHandler = async (event) => {
	const verifyResult = await verifyPlayerInRoomWithStatus(
		event.request,
		event.params.name!,
		'waiting'
	);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;
	if (!game.autoAssignRolesAndColors) {
		return json({ message: '手動選角房間不使用準備切換' }, { status: 400 });
	}

	let body: { isReady?: unknown };
	try {
		body = await event.request.json();
	} catch {
		return json({ message: '無效的 JSON 格式' }, { status: 400 });
	}

	if (typeof body.isReady !== 'boolean') {
		return json({ message: '準備狀態必須是布林值' }, { status: 400 });
	}

	let stateError: string | null = null;
	await db.transaction(async (tx) => {
		await tx.execute(
			sql`SELECT ${games.id} FROM ${games} WHERE ${games.id} = ${game.id} FOR UPDATE`
		);
		const [lockedGame] = await tx.select().from(games).where(eq(games.id, game.id)).limit(1);
		if (!lockedGame || lockedGame.status !== 'waiting') {
			stateError = '遊戲已經開始，無法更新準備狀態';
			return;
		}
		if (!lockedGame.autoAssignRolesAndColors) {
			stateError = '手動選角房間不使用準備切換';
			return;
		}

		await tx
			.update(gamePlayers)
			.set({ isReady: body.isReady as boolean, lastActiveAt: new Date() })
			.where(eq(gamePlayers.id, player.id));
	});

	if (stateError) {
		return json({ message: stateError }, { status: 400 });
	}

	const gameState = await getGameState(game.id);
	const io = getSocketIO();
	if (io) {
		io.to(game.roomName).emit('room-update', {
			game: gameState.game,
			players: gameState.players
		});
	}

	return json({ message: body.isReady ? '已準備' : '已取消準備', isReady: body.isReady });
};

export const POST: RequestHandler = async (event) => {
	// 驗證用戶、房間和玩家信息，並確保遊戲在選角階段
	const verifyResult = await verifyPlayerInRoomWithStatus(
		event.request,
		event.params.name!,
		'selecting'
	);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;

	// 檢查是否為房主
	if (!player.isHost) {
		return json({ message: '只有房主才能執行此操作' }, { status: 403 });
	}

	// 獲取所有玩家
	const allPlayers = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, game.id));

	// 檢查是否所有玩家都已鎖定
	const notReadyPlayers = allPlayers.filter((p) => !p.isReady);
	if (notReadyPlayers.length > 0) {
		return json(
			{
				message: `還有 ${notReadyPlayers.length} 位玩家尚未鎖定選擇`,
				notReadyCount: notReadyPlayers.length
			},
			{ status: 400 }
		);
	}

	// 檢查角色是否有重複
	const roleIds = allPlayers.map((p) => p.roleId).filter((id) => id !== null);
	const uniqueRoleIds = new Set(roleIds);
	if (roleIds.length !== uniqueRoleIds.size) {
		return json(
			{
				message: '存在重複的角色選擇，請玩家重新選擇',
				conflict: 'role'
			},
			{ status: 400 }
		);
	}

	// 檢查顏色是否有重複
	const colors = allPlayers.map((p) => p.color).filter((c) => c !== null);
	const uniqueColors = new Set(colors);
	if (colors.length !== uniqueColors.size) {
		return json(
			{
				message: '存在重複的顏色選擇，請玩家重新選擇',
				conflict: 'color'
			},
			{ status: 400 }
		);
	}

	// 所有檢查通過
	return json(
		{
			message: '所有玩家選擇檢查通過，可以開始遊戲',
			playersReady: allPlayers.length,
			success: true
		},
		{ status: 200 }
	);
};
