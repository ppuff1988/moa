import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user, passwordResetToken, session } from '$lib/server/db/schema';
import { eq, and, isNull, gt, sql } from 'drizzle-orm';
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

		const hashedPassword = await hashPassword(password);
		const resetAt = new Date();
		const passwordWasReset = await db.transaction(async (tx) => {
			const [claimedToken] = await tx
				.update(passwordResetToken)
				.set({ usedAt: resetAt })
				.where(
					and(
						eq(passwordResetToken.token, token),
						isNull(passwordResetToken.usedAt),
						gt(passwordResetToken.expiresAt, resetAt)
					)
				)
				.returning({ userId: passwordResetToken.userId });

			if (!claimedToken) return false;

			await tx
				.update(user)
				.set({
					passwordHash: hashedPassword,
					tokenVersion: sql`${user.tokenVersion} + 1`,
					updatedAt: resetAt
				})
				.where(eq(user.id, claimedToken.userId));

			await tx.delete(session).where(eq(session.userId, claimedToken.userId));
			return true;
		});

		if (!passwordWasReset) {
			return json({ message: '重置連結無效或已過期' }, { status: 400 });
		}

		if (process.env.NODE_ENV !== 'test') {
			console.log('✅ 密碼重置成功');
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
