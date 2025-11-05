import { lucia } from '$lib/server/lucia';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	// 如果有 Lucia session，則登出
	if (locals.session) {
		await lucia.invalidateSession(locals.session.id);
		const sessionCookie = lucia.createBlankSessionCookie();
		cookies.set(sessionCookie.name, sessionCookie.value, {
			...sessionCookie.attributes,
			path: '/'
		});
	}

	// 清除 JWT cookie（向下相容）
	cookies.delete('jwt', { path: '/' });

	throw redirect(302, '/auth/login');
};
