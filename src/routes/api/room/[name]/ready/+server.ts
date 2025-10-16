import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

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
