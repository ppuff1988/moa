import { getLeaderboard } from '$lib/server/leaderboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	return {
		leaderboard: await getLeaderboard(null, url.searchParams.get('page')),
		title: '玩家勝場排行榜與八席名家｜古董局中局 MOA',
		description:
			'查看古董局中局玩家累計勝場排名，以及八個角色的專屬榮譽與勝場榜。只計正式完成對局，同勝場並列。'
	};
};
