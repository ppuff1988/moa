import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user, passwordResetToken } from '$lib/server/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { hashPassword } from '$lib/server/password';

/**
 * POST /api/auth/reset-password
 * 重置密碼
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { token, password } = await request.json();

		if (!token || !password) {
			return json({ message: '缺少必要參數' }, { status: 400 });
		}

		if (password.length < 6) {
			return json({ message: '密碼長度至少需要 6 個字元' }, { status: 400 });
		}

		// 查詢 token
		const tokens = await db
			.select()
			.from(passwordResetToken)
			.where(
				and(
					eq(passwordResetToken.token, token),
					isNull(passwordResetToken.usedAt),
					gt(passwordResetToken.expiresAt, new Date())
				)
			)
			.limit(1);

		if (tokens.length === 0) {
			return json({ message: '重置連結無效或已過期' }, { status: 400 });
		}

		const resetTokenData = tokens[0];

		// 更新用戶密碼
		const hashedPassword = await hashPassword(password);
		await db
			.update(user)
			.set({
				passwordHash: hashedPassword,
				updatedAt: new Date()
			})
			.where(eq(user.id, resetTokenData.userId));

		// 標記 token 為已使用
		await db
			.update(passwordResetToken)
			.set({
				usedAt: new Date()
			})
			.where(eq(passwordResetToken.id, resetTokenData.id));

		if (process.env.NODE_ENV !== 'test') {
			console.log('✅ 密碼重置成功，用戶 ID:', resetTokenData.userId);
		}

		return json(
			{
				message: '密碼重置成功，請使用新密碼登入'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('重置密碼錯誤:', error);
		return json({ message: '伺服器錯誤，請稍後再試' }, { status: 500 });
	}
};
