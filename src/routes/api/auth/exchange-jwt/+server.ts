import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lucia } from '$lib/server/lucia';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateJWT, type JWTPayload } from '$lib/server/auth';

/**
 * Exchange Lucia session for JWT token
 *
 * 此 API 用於將 Lucia session 轉換為 JWT token
 * 適用於需要使用 JWT 認證的場景（例如：移動應用、第三方整合）
 *
 * 使用方式：
 * 1. 用戶通過 Google OAuth 或一般登入成功後，會建立 Lucia session
 * 2. 前端調用此 API（會自動帶上 session cookie）
 * 3. API 驗證 session 並返回 JWT token
 * 4. 前端可使用 JWT token 調用其他 API
 */
export const POST: RequestHandler = async ({ cookies }) => {
	try {
		console.log('🔄 Exchange JWT API 被調用');
		console.log('   Session cookie 名稱:', lucia.sessionCookieName);

		// 從 cookie 中取得 session ID
		const sessionId = cookies.get(lucia.sessionCookieName);
		console.log('   Session ID:', sessionId ? '✓ 存在' : '❌ 不存在');

		// 調試：列出所有 cookies
		const allCookies = cookies.getAll();
		console.log('   所有 cookies:', allCookies.map((c) => c.name).join(', '));

		if (!sessionId) {
			return json(
				{
					success: false,
					message: '未登入或 session 已過期'
				},
				{ status: 401 }
			);
		}

		// 驗證 session
		console.log('   正在驗證 session...');
		const { session, user: luciaUser } = await lucia.validateSession(sessionId);
		console.log('   Session 驗證結果:', session ? '✓ 有效' : '❌ 無效');
		console.log('   User 資料:', luciaUser ? '✓ 存在' : '❌ 不存在');

		if (!session || !luciaUser) {
			return json(
				{
					success: false,
					message: 'Session 無效或已過期'
				},
				{ status: 401 }
			);
		}

		// 取得完整的用戶資料
		const userId = Number(luciaUser.id);
		const [foundUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

		if (!foundUser) {
			return json(
				{
					success: false,
					message: '用戶不存在'
				},
				{ status: 404 }
			);
		}

		// 生成 JWT token
		const jwtPayload: JWTPayload = {
			userId: foundUser.id,
			email: foundUser.email,
			tokenVersion: foundUser.tokenVersion
		};

		const token = generateJWT(jwtPayload);

		// 如果 session 需要更新，更新 cookie
		if (session.fresh) {
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				...sessionCookie.attributes,
				path: '/'
			});
		}

		console.log('✅ JWT token 生成成功');

		return json({
			success: true,
			message: 'JWT token 生成成功',
			data: {
				token,
				user: {
					id: foundUser.id,
					email: foundUser.email,
					nickname: foundUser.nickname
				}
			}
		});
	} catch (error) {
		console.error('Exchange JWT error:', error);
		return json(
			{
				success: false,
				message: '伺服器錯誤，請稍後再試'
			},
			{ status: 500 }
		);
	}
};

/**
 * GET endpoint for convenience
 * 有些客戶端更方便使用 GET 請求
 */
export const GET: RequestHandler = async (event) => {
	return POST(event);
};
