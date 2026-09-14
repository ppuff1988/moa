import { getLeaderboard } from '$lib/server/leaderboard';
import { createLeaderboardSchema } from '$lib/content/leaderboard-seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const title = '玩家勝場排行榜與八席名家｜古董局中局 MOA';
	const description =
		'查看古董局中局玩家累計勝場排名，以及八個角色的專屬榮譽與勝場榜。只計正式完成對局，同勝場並列。';
	const leaderboard = await getLeaderboard(null);
	return {
		leaderboard,
		title,
		description,
		structuredData: createLeaderboardSchema({
			path: '/leaderboard',
			title,
			description,
			leaderboard
		})
	};
};
