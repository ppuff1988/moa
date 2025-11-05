import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuthToken } from '$lib/server/api-helpers';

// GET - 獲取用戶資料
export const GET: RequestHandler = async ({ request }) => {
	try {
		const authResult = await verifyAuthToken(request);
		if ('error' in authResult) {
			return authResult.error;
		}
		const { user: currentUser } = authResult;

		return json({
			id: currentUser.id,
			email: currentUser.email,
			nickname: currentUser.nickname,
			avatar: currentUser.avatar
		});
	} catch (error) {
		console.error('獲取用戶資料錯誤:', error);
		return json({ error: '伺服器錯誤' }, { status: 500 });
	}
};

// PUT - 更新用戶資料
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const authResult = await verifyAuthToken(request);
		if ('error' in authResult) {
			return authResult.error;
		}
		const { user: currentUser } = authResult;

		const body = await request.json();
		const { nickname, avatar } = body;

		// 驗證輸入
		if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
			return json({ error: '暱稱不能為空' }, { status: 400 });
		}

		if (nickname.trim().length > 50) {
			return json({ error: '暱稱不能超過 50 個字符' }, { status: 400 });
		}

		// 更新用戶資料
		const updateData: {
			nickname: string;
			updatedAt: Date;
			avatar?: string | null;
		} = {
			nickname: nickname.trim(),
			updatedAt: new Date()
		};

		if (avatar !== undefined) {
			updateData.avatar = avatar;
		}

		await db.update(user).set(updateData).where(eq(user.id, currentUser.id));

		// 獲取更新後的用戶資料
		const [updatedUser] = await db.select().from(user).where(eq(user.id, currentUser.id)).limit(1);

		return json({
			id: updatedUser.id,
			email: updatedUser.email,
			nickname: updatedUser.nickname,
			avatar: updatedUser.avatar
		});
	} catch (error) {
		console.error('更新用戶資料錯誤:', error);
		return json({ error: '伺服器錯誤' }, { status: 500 });
	}
};
