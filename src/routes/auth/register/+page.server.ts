import { redirect } from '@sveltejs/kit';
import type { ServerLoadEvent } from '@sveltejs/kit';

export const load = async ({ locals }: ServerLoadEvent) => {
	// 如果用戶已經登入，重定向到首頁
	if (locals.user) {
		throw redirect(302, '/');
	}

	return {
		title: '註冊 - 古董局中局非官方APP',
		description: '註冊古董局中局非官方APP，開始您的古董鑑賞之旅'
	};
};
