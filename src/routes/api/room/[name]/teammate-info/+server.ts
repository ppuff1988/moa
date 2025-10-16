import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gamePlayers, roles, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// 獲取老朝奉或藥不然的隊友信息
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game, player } = verifyResult;

	try {
		// 獲取當前玩家的角色
		let myRole = null;
		if (player.roleId) {
			const roleResult = await db
				.select({
					name: roles.name,
					camp: roles.camp
				})
				.from(roles)
				.where(eq(roles.id, player.roleId))
				.limit(1);

			myRole = roleResult[0] || null;
		} else {
			return json({
				success: true,
				hasTeammate: false,
				teammate: null
			});
		}

		// 只有老朝奉和藥不然可以看到隊友
		if (!myRole || (myRole.name !== '老朝奉' && myRole.name !== '藥不然')) {
			return json({
				success: true,
				hasTeammate: false,
				teammate: null
			});
		}

		// 查找隊友（老朝奉陣營的另一個角色）
		const targetRoleName = myRole.name === '老朝奉' ? '藥不然' : '老朝奉';

		// 獲取目標角色的 ID
		const targetRoleResult = await db
			.select({
				id: roles.id,
				name: roles.name
			})
			.from(roles)
			.where(eq(roles.name, targetRoleName))
			.limit(1);

		const targetRole = targetRoleResult[0] || null;

		if (!targetRole) {
			return json({
				success: true,
				hasTeammate: false,
				teammate: null
			});
		}

		// 查找擁有該角色的玩家，並 JOIN users 表獲取 nickname
		const teammateResult = await db
			.select({
				playerId: gamePlayers.id,
				userId: gamePlayers.userId,
				color: gamePlayers.color,
				colorCode: gamePlayers.colorCode,
				nickname: user.nickname
			})
			.from(gamePlayers)
			.innerJoin(user, eq(gamePlayers.userId, user.id))
			.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.roleId, targetRole.id)))
			.limit(1);

		if (!teammateResult || teammateResult.length === 0) {
			return json({
				success: true,
				hasTeammate: false,
				teammate: null
			});
		}

		const teammatePlayer = teammateResult[0];

		return json({
			success: true,
			hasTeammate: true,
			teammate: {
				roleName: targetRole.name,
				nickname: teammatePlayer.nickname,
				colorCode: teammatePlayer.colorCode
			}
		});
	} catch (error) {
		console.error('[teammate-info] 獲取隊友信息錯誤:', error);
		return json(
			{
				success: false,
				error: '無法獲取隊友信息',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
