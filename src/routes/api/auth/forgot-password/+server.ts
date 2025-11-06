import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user, passwordResetToken, oauthAccount } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { queuePasswordResetEmail } from '$lib/server/email';
import crypto from 'crypto';
import { env } from '$env/dynamic/private';

/**
 * POST /api/auth/forgot-password
 * 請求重置密碼
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email } = await request.json();

		if (!email) {
			return json({ message: '請輸入 Email' }, { status: 400 });
		}

		// 查詢用戶
		const foundUser = await db.select().from(user).where(eq(user.email, email)).limit(1);

		// 即使用戶不存在也返回成功，避免暴露用戶資訊
		if (foundUser.length === 0) {
			console.log('📧 用戶不存在，但返回成功訊息:', email);
			return json(
				{
					message: '如果該 Email 已註冊，您將收到密碼重置郵件'
				},
				{ status: 200 }
			);
		}

		const userData = foundUser[0];

		// 檢查是否為 OAuth 用戶（沒有密碼）
		const oauthAccounts = await db
			.select()
			.from(oauthAccount)
			.where(eq(oauthAccount.userId, userData.id))
			.limit(1);

		if (oauthAccounts.length > 0 || !userData.passwordHash) {
			console.log('📧 OAuth 用戶嘗試重置密碼:', email);
			return json(
				{
					message: '此帳號使用第三方登入（如 Google），無法重置密碼'
				},
				{ status: 400 }
			);
		}

		// 生成重置 token
		const resetToken = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 小時後過期

		// 儲存 token
		await db.insert(passwordResetToken).values({
			userId: userData.id,
			token: resetToken,
			expiresAt
		});

		// 將郵件加入隊列（非阻塞，立即返回）
		const baseUrl = env.DEPLOY_URL || `${request.url.split('/api')[0]}`;
		const jobId = await queuePasswordResetEmail(email, resetToken, baseUrl);

		if (!jobId) {
			console.error('❌ 郵件加入隊列失敗');
			return json({ message: '郵件發送失敗，請稍後再試' }, { status: 500 });
		}

		console.log('✅ 密碼重置郵件已加入隊列:', email, 'Job ID:', jobId);

		return json(
			{
				message: '密碼重置郵件已發送，請檢查您的信箱'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('忘記密碼錯誤:', error);
		return json({ message: '伺服器錯誤，請稍後再試' }, { status: 500 });
	}
};
