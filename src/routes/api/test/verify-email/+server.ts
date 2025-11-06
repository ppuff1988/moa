import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 測試專用 API：直接驗證用戶的 Email
 * 僅在非生產環境中可用
 */
export const POST: RequestHandler = async ({ request }) => {
	console.log('📧 [測試API] 收到 Email 驗證請求');

	// 安全檢查：只在測試/開發環境中允許
	if (process.env.NODE_ENV === 'production') {
		console.log('❌ [測試API] 拒絕：生產環境');
		return json({ error: '此端點在生產環境中不可用' }, { status: 403 });
	}

	try {
		const { email } = await request.json();
		console.log(`📧 [測試API] 驗證 Email: ${email}`);

		if (!email) {
			console.log('❌ [測試API] 錯誤：未提供 Email');
			return json({ error: '請提供 Email' }, { status: 400 });
		}

		// 查找用戶
		const [foundUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);

		if (!foundUser) {
			console.log(`❌ [測試API] 錯誤：用戶不存在 (${email})`);
			return json({ error: '用戶不存在' }, { status: 404 });
		}

		console.log(`✅ [測試API] 找到用戶: ${email}, 當前驗證狀態: ${foundUser.emailVerified}`);

		// 直接設置為已驗證
		await db
			.update(user)
			.set({
				emailVerified: true,
				emailVerificationToken: null,
				emailVerificationTokenExpiresAt: null,
				updatedAt: new Date()
			})
			.where(eq(user.email, email));

		console.log(`✅ [測試API] Email 已驗證: ${email}`);

		return json({
			message: 'Email 已驗證',
			email: email
		});
	} catch (error) {
		console.error('❌ [測試API] 測試驗證 Email 錯誤:', error);
		return json({ error: '伺服器錯誤' }, { status: 500 });
	}
};
