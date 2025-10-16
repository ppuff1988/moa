import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { roles } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ url }) => {
	try {
		// 獲取玩家人數參數
		const playerCountParam = url.searchParams.get('playerCount');
		const playerCount = playerCountParam ? parseInt(playerCountParam) : null;

		// 獲取所有角色
		const allRoles = await db
			.select({
				id: roles.id,
				name: roles.name,
				camp: roles.camp
			})
			.from(roles)
			.orderBy(roles.id);

		// 根據玩家人數過濾角色
		let filteredRoles = allRoles;
		if (playerCount !== null) {
			if (playerCount === 6) {
				// 6人遊戲：排除姬云浮和鄭國渠
				filteredRoles = allRoles.filter((role) => role.name !== '姬云浮' && role.name !== '鄭國渠');
			} else if (playerCount === 7) {
				// 7人遊戲：排除姬云浮
				filteredRoles = allRoles.filter((role) => role.name !== '姬云浮');
			} else {
				// 8人遊戲：所有角色都可選
				filteredRoles = allRoles;
			}
		}

		return json(
			{
				roles: filteredRoles
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('獲取角色列表失敗:', error);
		return json({ message: '獲取角色列表失敗' }, { status: 500 });
	}
};
