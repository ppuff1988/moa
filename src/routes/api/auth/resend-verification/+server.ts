import { json, type RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateVerificationToken } from '$lib/server/auth';
import { queueEmailVerification } from '$lib/server/email';

export async function POST({ request, url }: RequestEvent) {
	try {
		const { email } = await request.json();

		if (!email) {
			return json({ message: '請提供 Email 地址' }, { status: 400 });
		}

		// 查找用戶
		const foundUser = await db.select().from(user).where(eq(user.email, email)).limit(1);

		if (foundUser.length === 0) {
			// 為了安全，不透露用戶是否存在
			return json(
				{
					message: '如果該 Email 存在且未驗證，我們已發送驗證郵件'
				},
				{ status: 200 }
			);
		}

		const userData = foundUser[0];

		// 如果已經驗證，不需要重新發送
		if (userData.emailVerified) {
			return json(
				{
					message: '此 Email 已經驗證，可以直接登入'
				},
				{ status: 200 }
			);
		}

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
			console.log(`✅ 重新發送驗證郵件已加入隊列 [${jobId}]，收件者: ${email}`);
		}

		return json(
			{
				message: '驗證郵件已發送，請檢查您的信箱（包括垃圾郵件資料夾）'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('重新發送驗證郵件錯誤:', error);
		return json({ message: '伺服器錯誤，請稍後再試' }, { status: 500 });
	}
}
