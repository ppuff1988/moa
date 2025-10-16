import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	// 檢查用戶是否已登入
	if (!locals.user) {
		// 未登入，重定向到登入頁
		throw redirect(302, '/auth/login');
	}

	// 重定向到 lobby 頁面
	throw redirect(302, `/room/${params.name}/lobby`);
};
