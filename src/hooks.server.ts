import { getUserFromJWT } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { lucia } from '$lib/server/lucia';
import type { Handle } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
	// 步驟一：優先以 Lucia Session 驗證（適用於所有瀏覽器請求）
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (sessionId) {
		try {
			const { session, user: luciaUser } = await lucia.validateSession(sessionId);

			if (session && session.fresh) {
				// 自動更新 session cookie（滾動式過期）
				const sessionCookie = lucia.createSessionCookie(session.id);
				event.cookies.set(sessionCookie.name, sessionCookie.value, {
					...sessionCookie.attributes,
					path: '/'
				});
			}

			if (session && luciaUser) {
				// Session 有效：取得完整 User 資料
				const userId = Number(luciaUser.id);
				if (!isNaN(userId)) {
					const fullUser = await db.select().from(user).where(eq(user.id, userId)).limit(1);
					if (fullUser.length > 0) {
						event.locals.user = fullUser[0];
						event.locals.session = {
							id: session.id,
							userId: userId,
							expiresAt: session.expiresAt
						};
						return resolve(event);
					}
				}
			}

			// Session 無效或已過期：清除 cookie，繼續嘗試 JWT fallback
			const blankCookie = lucia.createBlankSessionCookie();
			event.cookies.set(blankCookie.name, blankCookie.value, {
				...blankCookie.attributes,
				path: '/'
			});
		} catch (error) {
			console.error('Session validation error:', error);
			// 清除無效的 session cookie，繼續嘗試 JWT fallback
			try {
				const blankCookie = lucia.createBlankSessionCookie();
				event.cookies.set(blankCookie.name, blankCookie.value, {
					...blankCookie.attributes,
					path: '/'
				});
			} catch {
				// ignore
			}
		}
	}

	// 步驟二：JWT fallback（支援 Bearer token API 存取 及 jwt cookie）
	const authHeader = event.request.headers.get('authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : event.cookies.get('jwt');

	if (token) {
		event.locals.user = await getUserFromJWT(token);
	} else {
		event.locals.user = null;
	}
	event.locals.session = null;
	return resolve(event);
};
