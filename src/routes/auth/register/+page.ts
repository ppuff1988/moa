import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return {
		title: '註冊 - 古董局中局非官方APP',
		description: '註冊古董局中局非官方APP 帳號，免費線上桌遊輔助工具，立即開始遊戲'
	};
};
