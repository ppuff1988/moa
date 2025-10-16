import type { Handle } from '@sveltejs/kit';
import { getUserFromJWT } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// 從 Authorization header 或 cookie 中取得 JWT token
	const authHeader = event.request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : event.cookies.get('jwt');

	if (!token) {
		event.locals.user = null;
		return resolve(event);
	}

	const user = await getUserFromJWT(token);
	event.locals.user = user;

	return resolve(event);
};
