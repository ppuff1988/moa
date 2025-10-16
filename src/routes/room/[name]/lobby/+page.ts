import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const roomName = params.name;

	return {
		title: `遊戲大廳 - ${roomName} - MOA 古董局中局`,
		description: `在房間 ${roomName} 的遊戲大廳等待其他玩家加入`
	};
};
