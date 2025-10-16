import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return {
		title: '註冊 - MOA 古董局中局',
		description: '註冊 MOA 古董局中局線上桌遊帳號，立即開始遊戲'
	};
};
