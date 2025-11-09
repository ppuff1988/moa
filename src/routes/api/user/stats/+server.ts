import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { games, gamePlayers, roles } from '$lib/server/db/schema';
import { eq, and, isNotNull, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: '未授權' }, { status: 401 });
	}

	try {
		const userId = locals.user.id;

		// 查詢用戶參與的所有已完成遊戲
		const userGames = await db
			.select({
				gameId: gamePlayers.gameId,
				roleId: gamePlayers.roleId,
				roleName: roles.name,
				roleCamp: roles.camp,
				gameStatus: games.status,
				totalScore: games.totalScore,
				finishedAt: games.finishedAt
			})
			.from(gamePlayers)
			.innerJoin(games, eq(gamePlayers.gameId, games.id))
			.leftJoin(roles, eq(gamePlayers.roleId, roles.id))
			.where(
				and(
					eq(gamePlayers.userId, userId),
					eq(games.status, 'finished'),
					isNotNull(gamePlayers.roleId)
				)
			)
			.orderBy(desc(games.finishedAt));

		// 統計數據
		let xuYuanWins = 0;
		let laoChaoFengWins = 0;
		const roleStats: Record<string, number> = {};
		const recentGames: Array<{
			gameId: string;
			roleName: string;
			camp: string;
			result: string;
			score: number;
			finishedAt: Date | null;
		}> = [];

		for (const game of userGames) {
			// 跳過沒有角色或陣營的數據
			if (!game.roleName || !game.roleCamp) {
				continue;
			}

			// 跳過明顯的測試角色名稱
			const invalidRoleNames = ['test', 'undefined', 'null', ''];
			const roleNameLower = game.roleName.toLowerCase().trim();
			if (invalidRoleNames.includes(roleNameLower)) {
				continue;
			}

			const roleName = game.roleName;
			const roleCamp = game.roleCamp;

			// 將 good/bad 轉換為中文陣營名稱
			let campDisplayName: string;
			if (roleCamp === 'good') {
				campDisplayName = '許愿陣營';
			} else if (roleCamp === 'bad') {
				campDisplayName = '老朝奉陣營';
			} else {
				// 如果陣營不是 good 或 bad，跳過
				continue;
			}

			// 統計角色使用次數
			roleStats[roleName] = (roleStats[roleName] || 0) + 1;

			// 判斷勝負
			let result = '未知';
			const isGoodCamp = roleCamp === 'good'; // good = 許愿陣營
			const score = game.totalScore || 0;

			if (isGoodCamp) {
				// 許愿陣營（good）：6 分以上獲勝
				if (score >= 6) {
					result = '勝利';
					xuYuanWins++;
				} else {
					result = '失敗';
				}
			} else {
				// 老朝奉陣營（bad）：阻止許愿陣營達到 6 分
				if (score < 6) {
					result = '勝利';
					laoChaoFengWins++;
				} else {
					result = '失敗';
				}
			}

			// 添加到近期遊戲記錄（使用中文陣營名稱）
			recentGames.push({
				gameId: game.gameId,
				roleName,
				camp: campDisplayName,
				result,
				score,
				finishedAt: game.finishedAt
			});
		}

		// 重新計算總場次（基於有效遊戲）
		const validTotalGames = recentGames.length;

		// 計算勝率
		const totalWins = xuYuanWins + laoChaoFengWins;
		const winRate = validTotalGames > 0 ? Math.round((totalWins / validTotalGames) * 100) : 0;

		// 找出最常使用的角色
		const sortedRoles = Object.entries(roleStats)
			.sort((a, b) => b[1] - a[1])
			.map(([name, count]) => ({ name, count }));

		return json({
			totalGames: validTotalGames,
			totalWins,
			winRate,
			xuYuanWins,
			laoChaoFengWins,
			roleStats: sortedRoles,
			recentGames: recentGames.slice(0, 5) // 只返回最近 5 場
		});
	} catch (error) {
		console.error('獲取用戶統計失敗:', error);
		return json({ message: '獲取統計資料失敗' }, { status: 500 });
	}
};
