import { redirect, json } from '@sveltejs/kit';
import { google, lucia } from '$lib/server/lucia';
import { db } from '$lib/server/db';
import { user, oauthAccount } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { OAuth2RequestError } from 'arctic';
import { generateAndSetJWTCookie } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('google_oauth_state');
	const storedCodeVerifier = cookies.get('google_oauth_code_verifier');

	// 驗證 state 和 code
	if (!code || !state || !storedState || state !== storedState || !storedCodeVerifier) {
		// 清理可能存在的 cookies
		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_oauth_code_verifier', { path: '/' });

		// 重定向到友好的錯誤頁面
		throw redirect(302, '/auth/oauth-error');
	}

	// 立即清除 OAuth cookies 以防止重複使用
	cookies.delete('google_oauth_state', { path: '/' });
	cookies.delete('google_oauth_code_verifier', { path: '/' });

	// 檢查是否需要返回 JWT（用於 API 客戶端）
	const returnJwt = url.searchParams.get('return_jwt') === 'true';

	let loggedInUser: typeof user.$inferSelect | null = null;

	try {
		// 使用授權碼換取 access token
		const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);

		// 使用 access token 獲取用戶資訊
		const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: {
				Authorization: `Bearer ${tokens.accessToken()}`
			}
		});

		const googleUser: GoogleUser = await response.json();

		// 檢查是否已存在 OAuth 帳號
		const [existingAccount] = await db
			.select()
			.from(oauthAccount)
			.where(
				and(eq(oauthAccount.providerId, 'google'), eq(oauthAccount.providerUserId, googleUser.sub))
			)
			.limit(1);

		if (existingAccount) {
			// 已存在的 OAuth 帳號，直接登入

			const [existingUser] = await db
				.select()
				.from(user)
				.where(eq(user.id, existingAccount.userId))
				.limit(1);

			if (existingUser) {
				// 更新用戶的 avatar（如果 Google 提供了新的頭像）
				if (googleUser.picture && existingUser.avatar !== googleUser.picture) {
					await db
						.update(user)
						.set({ avatar: googleUser.picture })
						.where(eq(user.id, existingUser.id));
					loggedInUser = { ...existingUser, avatar: googleUser.picture };
				} else {
					loggedInUser = existingUser;
				}
			} else {
				// OAuth 帳號存在但用戶不存在（可能被刪除），重新創建用戶

				// 先刪除舊的 OAuth 關聯
				await db
					.delete(oauthAccount)
					.where(
						and(
							eq(oauthAccount.providerId, existingAccount.providerId),
							eq(oauthAccount.providerUserId, existingAccount.providerUserId)
						)
					);

				// 檢查 email 是否被其他帳號使用
				const [userWithEmail] = await db
					.select()
					.from(user)
					.where(eq(user.email, googleUser.email))
					.limit(1);

				if (userWithEmail) {
					// Email 被其他帳號使用，關聯到該帳號
					loggedInUser = userWithEmail;

					// 創建新的 OAuth 關聯
					await db.insert(oauthAccount).values({
						providerId: 'google',
						providerUserId: googleUser.sub,
						userId: userWithEmail.id
					});
				} else {
					// 創建新用戶
					const [newUser] = await db
						.insert(user)
						.values({
							email: googleUser.email,
							nickname: googleUser.name || googleUser.email.split('@')[0],
							passwordHash: null,
							avatar: googleUser.picture || null
						})
						.returning();

					loggedInUser = newUser;

					// 創建新的 OAuth 關聯
					await db.insert(oauthAccount).values({
						providerId: 'google',
						providerUserId: googleUser.sub,
						userId: newUser.id
					});
				}
			}

			// 創建 session
			if (loggedInUser) {
				const session = await lucia.createSession(String(loggedInUser.id), {});
				const sessionCookie = lucia.createSessionCookie(session.id);

				cookies.set(sessionCookie.name, sessionCookie.value, {
					...sessionCookie.attributes,
					path: '/'
				});
			}
		} else {
			// 檢查該 email 是否已被使用
			const [existingUser] = await db
				.select()
				.from(user)
				.where(eq(user.email, googleUser.email))
				.limit(1);

			let userId: number;

			if (existingUser) {
				// Email 已存在，關聯到現有帳號
				userId = existingUser.id;

				// 更新用戶的 avatar（如果 Google 提供了新的頭像）
				if (googleUser.picture && existingUser.avatar !== googleUser.picture) {
					await db
						.update(user)
						.set({ avatar: googleUser.picture })
						.where(eq(user.id, existingUser.id));
					loggedInUser = { ...existingUser, avatar: googleUser.picture };
				} else {
					loggedInUser = existingUser;
				}
			} else {
				// 建立新用戶
				const [newUser] = await db
					.insert(user)
					.values({
						email: googleUser.email,
						nickname: googleUser.name || googleUser.email.split('@')[0],
						passwordHash: null, // OAuth 用戶不需要密碼
						avatar: googleUser.picture || null
					})
					.returning();
				userId = newUser.id;
				loggedInUser = newUser;
			}

			// 建立 OAuth 帳號關聯
			await db.insert(oauthAccount).values({
				providerId: 'google',
				providerUserId: googleUser.sub,
				userId
			});

			// 建立 session
			const session = await lucia.createSession(String(userId), {});
			const sessionCookie = lucia.createSessionCookie(session.id);

			cookies.set(sessionCookie.name, sessionCookie.value, {
				...sessionCookie.attributes,
				path: '/'
			});
		}

		// 創建 cookie adapter 來符合 generateAndSetJWTCookie 的型別要求
		const cookieAdapter = {
			set: (name: string, value: string, options: Record<string, unknown>) => {
				// 將 options 轉換為 SvelteKit cookies.set 需要的格式，確保包含 path
				const cookieOptions = {
					...options,
					path: (options.path as string) || '/'
				};
				cookies.set(name, value, cookieOptions);
			}
		};

		// 如果請求返回 JWT，直接生成並返回 JSON（用於 API 客戶端）
		if (returnJwt && loggedInUser) {
			const token = generateAndSetJWTCookie(loggedInUser, cookieAdapter);

			return json({
				success: true,
				message: '登入成功',
				data: {
					token,
					user: {
						id: loggedInUser.id,
						email: loggedInUser.email,
						nickname: loggedInUser.nickname
					}
				}
			});
		}

		// 生成 JWT token 用於前端
		if (loggedInUser) {
			const token = generateAndSetJWTCookie(loggedInUser, cookieAdapter);

			// 重定向到 OAuth success 頁面，並通過 URL 參數傳遞 token
			// 這樣可以確保前端能收到 token
			throw redirect(302, `/auth/oauth-success?token=${encodeURIComponent(token)}`);
		}

		// 如果沒有用戶信息，重定向到錯誤頁面
		throw redirect(302, '/auth/oauth-error');
	} catch (e) {
		// 檢查是否是 SvelteKit 的 redirect
		// redirect() 拋出的對象有 status 和 location 屬性
		if (e && typeof e === 'object' && 'status' in e && 'location' in e) {
			// 這是正常的 redirect，直接重新拋出
			throw e;
		}

		// 檢查是否是 Response 對象
		if (e instanceof Response) {
			throw e;
		}

		// OAuth2RequestError 是預期的錯誤類型
		if (e instanceof OAuth2RequestError) {
			return new Response(null, {
				status: 400,
				statusText: 'OAuth request error'
			});
		}

		// 其他真正的錯誤
		return new Response(null, {
			status: 500,
			statusText: 'Internal server error'
		});
	}
};

interface GoogleUser {
	sub: string; // Google 用戶 ID
	name: string;
	email: string;
	picture: string;
	email_verified: boolean;
}
