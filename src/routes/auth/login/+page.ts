import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return {
		title: '登入 - 古董局中局非官方APP',
		description: '登入古董局中局非官方APP，與好友一起體驗策略與推理的樂趣'
	};
};
