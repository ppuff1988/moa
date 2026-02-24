import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const roomName = params.name;

	return {
		title: `遊戲中 - ${roomName} - 古董局中局非官方APP`,
		description: `正在房間 ${roomName} 進行古董局中局桌遊對局`
	};
};
