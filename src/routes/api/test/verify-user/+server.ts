import { json, type RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';

/**
 * POST /api/test/verify-user
 * 測試環境專用：直接驗證用戶 Email
 * 只在開發環境和測試環境中可用
 */
export async function POST({ request }: RequestEvent) {
	// 只在開發環境中允許使用此端點
	if (!dev && process.env.NODE_ENV !== 'test') {
		return json({ message: '此端點僅在測試環境中可用' }, { status: 403 });
	}

	try {
		const { email } = await request.json();

		if (!email) {
			return json({ message: '缺少 email 參數' }, { status: 400 });
		}

		// 查找用戶
		const foundUsers = await db
			.select()
			.from(user)
			.where(eq(user.email, email.toLowerCase().trim()))
			.limit(1);

		if (foundUsers.length === 0) {
			return json({ message: '用戶不存在' }, { status: 404 });
		}

		// 更新為已驗證
		await db
			.update(user)
			.set({
				emailVerified: true,
				emailVerificationToken: null,
				emailVerificationTokenExpiresAt: null
			})
			.where(eq(user.email, email.toLowerCase().trim()));

		console.log('✅ [測試] 用戶已驗證:', email);

		return json({ message: '用戶已驗證', email }, { status: 200 });
	} catch (error) {
		console.error('驗證用戶錯誤:', error);
		return json({ message: '伺服器錯誤' }, { status: 500 });
	}
}
