import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// 檢查用戶是否已登入
	if (!locals.user) {
		// 未登入，重定向到登入頁
		throw redirect(302, '/auth/login');
	}

	return {
		user: {
			id: locals.user.id,
			nickname: locals.user.nickname,
			email: locals.user.email,
			avatar: locals.user.avatar ?? null
		}
	};
};
