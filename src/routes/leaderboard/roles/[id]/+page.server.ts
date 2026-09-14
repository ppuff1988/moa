import { getLeaderboard } from '$lib/server/leaderboard';
import { roleHonors } from '$lib/content/role-honors';
import { createLeaderboardSchema } from '$lib/content/leaderboard-seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const leaderboard = await getLeaderboard(params.id);
	const role = leaderboard.roles.find((item) => item.id === leaderboard.selectedRoleId)!;
	const honor = roleHonors[role.name];
	const title = `${role.name}勝場榜${honor ? `・${honor.title}` : ''}｜古董局中局 MOA`;
	const description = `查看扮演${role.name}的玩家勝場、出場數與勝率。${honor?.comment ?? ''}依角色累計勝場排名，同分並列。`;
	return {
		leaderboard,
		title,
		description,
		structuredData: createLeaderboardSchema({
			path: `/leaderboard/roles/${role.id}`,
			title,
			description,
			leaderboard,
			roleName: role.name
		})
	};
};
