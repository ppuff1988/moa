import { dev } from '$app/environment';
import { generateUserJWT, generateVerificationToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { queueEmailVerification } from '$lib/server/email';
import { lucia } from '$lib/server/lucia';
import { verifyPassword } from '$lib/server/password';
import type { Actions, ServerLoadEvent } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

/**
 * Load 函式：處理頁面載入時的 server-side 邏輯
 * 場景：已登入用戶直接訪問 /auth/login（例如手動輸入網址或書籤）
 * 流程：GET /auth/login → hooks 設定 locals.user → load 檢測 → redirect 302 / → 瀏覽器跳轉
 */
export const load = async ({ locals }: ServerLoadEvent) => {
	// 如果用戶已經登入，重定向到首頁
	if (locals.user) {
		console.log('⚠️ 已登入用戶訪問登入頁，redirect 到首頁:', locals.user.email);
		throw redirect(302, '/');
	}

	return {
		title: '登入 - 古董局中局非官方APP',
		description: '登入古董局中局非官方APP，與好友一起體驗策略與推理的樂趣'
	};
};

/**
 * Form action 登入：cookie 設定與 redirect 在同一個 HTTP response 完成，
 * 避免 client-side fetch → window.location.href 在無痕模式下的 cookie race condition。
 */
export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { message: '請填寫 Email 和密碼', email });
		}

		try {
			const foundUser = await db.select().from(user).where(eq(user.email, email)).limit(1);

			if (foundUser.length === 0) {
				return fail(401, { message: 'Email 或密碼錯誤', email });
			}

			const userData = foundUser[0];

			if (!userData.passwordHash) {
				return fail(401, { message: '此帳號使用 Google 登入，請使用 Google 登入按鈕', email });
			}

			const isValidPassword = await verifyPassword(userData.passwordHash, password);
			if (!isValidPassword) {
				return fail(401, { message: 'Email 或密碼錯誤', email });
			}

			if (!userData.emailVerified) {
				// 自動重新發送驗證郵件
				try {
					const verificationToken = generateVerificationToken();
					const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
					await db
						.update(user)
						.set({
							emailVerificationToken: verificationToken,
							emailVerificationTokenExpiresAt: verificationTokenExpiresAt
						})
						.where(eq(user.email, email));
					const baseUrl = url.origin;
					await queueEmailVerification(email, verificationToken, baseUrl);
				} catch (emailError) {
					console.error('重新發送驗證郵件失敗:', emailError);
				}
				return fail(403, {
					message:
						'請先驗證您的 Email 地址。我們已重新發送驗證郵件，請檢查您的信箱（包括垃圾郵件資料夾）。',
					email,
					requiresVerification: true
				});
			}

			// 建立 Lucia Session
			const session = await lucia.createSession(String(userData.id), {});
			const sessionCookie = lucia.createSessionCookie(session.id);

			console.log('🔐 登入成功，設定 cookies:');
			console.log('   User ID:', userData.id);
			console.log('   Session ID:', session.id);
			console.log('   Cookie 名稱:', sessionCookie.name);
			console.log('   Cookie 屬性:', JSON.stringify(sessionCookie.attributes, null, 2));

			cookies.set(sessionCookie.name, sessionCookie.value, {
				...sessionCookie.attributes,
				path: '/'
			});

			// 同時設定 JWT cookie（向下相容，供客戶端 API 呼叫使用）
			const token = generateUserJWT(userData);
			cookies.set('jwt', token, {
				path: '/',
				httpOnly: false,
				secure: !dev,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30
			});

			console.log('   ✓ 兩個 cookies 已設定完成');
		} catch (error) {
			console.error('登入錯誤:', error);
			return fail(500, { message: '伺服器錯誤，請稍後再試' });
		}

		// Cookie 設定與 redirect 在同一個 response → 無 race condition
		throw redirect(303, '/');
	}
};
