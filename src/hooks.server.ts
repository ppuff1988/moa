import type { Handle } from '@sveltejs/kit';
import { getUserFromJWT } from '$lib/server/auth';
import { lucia } from '$lib/server/lucia';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
	// 優先檢查 Lucia Session
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	if (sessionId) {
		try {
			const { session, user: luciaUser } = await lucia.validateSession(sessionId);
			if (session && session.fresh) {
				const sessionCookie = lucia.createSessionCookie(session.id);
				event.cookies.set(sessionCookie.name, sessionCookie.value, {
					...sessionCookie.attributes,
					path: '/'
				});
			}
			if (!session) {
				const sessionCookie = lucia.createBlankSessionCookie();
				event.cookies.set(sessionCookie.name, sessionCookie.value, {
					...sessionCookie.attributes,
					path: '/'
				});
			}

			// 如果有 Lucia user，需要轉換為完整的 User 物件
			if (luciaUser) {
				const userId = Number(luciaUser.id);
				if (isNaN(userId)) {
					console.error('Invalid userId in luciaUser:', luciaUser.id);
					event.locals.user = null;
					event.locals.session = null;
					return resolve(event);
				}
				const fullUser = await db.select().from(user).where(eq(user.id, userId)).limit(1);
				event.locals.user = fullUser.length > 0 ? fullUser[0] : null;
			} else {
				event.locals.user = null;
			}

			event.locals.session = session
				? {
						id: session.id,
						userId: Number(session.userId),
						expiresAt: session.expiresAt
					}
				: null;

			return resolve(event);
		} catch (error) {
			console.error('Session validation error:', error);
			// 清除無效的 session cookie
			const sessionCookie = lucia.createBlankSessionCookie();
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				...sessionCookie.attributes,
				path: '/'
			});
			event.locals.user = null;
			event.locals.session = null;
		}
	}

	// 向下相容：檢查 JWT token
	const authHeader = event.request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : event.cookies.get('jwt');

	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	event.locals.user = await getUserFromJWT(token);
	event.locals.session = null;

	return resolve(event);
};
