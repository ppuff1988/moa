import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return {
		title: '登入 - MOA 古董局中局',
		description: '登入 MOA 古董局中局線上桌遊，與好友一起體驗策略與推理的樂趣'
	};
};
