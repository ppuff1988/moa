import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { verifyPassword } from '$lib/server/password';
import { generateUserJWT, generateVerificationToken } from '$lib/server/auth';
import { queueEmailVerification } from '$lib/server/email';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return json({ message: '請填寫 Email 和密碼' }, { status: 400 });
		}

		const foundUser = await db.select().from(user).where(eq(user.email, email)).limit(1);

		if (foundUser.length === 0) {
			return json({ message: 'Email 或密碼錯誤' }, { status: 401 });
		}

		const userData = foundUser[0];

		// 檢查是否為 OAuth 用戶（沒有密碼）
		if (!userData.passwordHash) {
			return json({ message: '此帳號使用 Google 登入，請使用 Google 登入按鈕' }, { status: 401 });
		}

		const isValidPassword = await verifyPassword(userData.passwordHash, password);
		if (!isValidPassword) {
			return json({ message: 'Email 或密碼錯誤' }, { status: 401 });
		}

		// 檢查 Email 是否已驗證
		if (!userData.emailVerified) {
			// 自動重新發送驗證郵件
			try {
				// 生成新的驗證 token
				const verificationToken = generateVerificationToken();
				const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小時

				// 更新用戶的驗證 token
				await db
					.update(user)
					.set({
						emailVerificationToken: verificationToken,
						emailVerificationTokenExpiresAt: verificationTokenExpiresAt
					})
					.where(eq(user.email, email));

				// 發送驗證郵件（使用隊列）
				const baseUrl = url.origin;
				const jobId = await queueEmailVerification(email, verificationToken, baseUrl);

				if (jobId) {
					console.log(`✅ 自動重新發送驗證郵件已加入隊列 [${jobId}]，收件者: ${email}`);
				}
			} catch (emailError) {
				console.error('重新發送驗證郵件失敗:', emailError);
				// 即使發送失敗，也繼續返回未驗證的錯誤
			}

			return json(
				{
					message:
						'請先驗證您的 Email 地址。我們已重新發送驗證郵件，請檢查您的信箱（包括垃圾郵件資料夾）。',
					requiresVerification: true
				},
				{ status: 403 }
			);
		}

		const token = generateUserJWT(userData);

		return json(
			{
				message: '登入成功',
				token,
				user: {
					id: userData.id,
					email: userData.email
				}
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('登入錯誤:', error);
		return json({ message: '伺服器錯誤，請稍後再試' }, { status: 500 });
	}
};
