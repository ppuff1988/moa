import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { verifyPassword } from '$lib/server/password';
import { generateUserJWT } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
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
