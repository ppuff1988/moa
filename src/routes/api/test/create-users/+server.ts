import { json, type RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/password';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';

export interface CreateUserRequest {
	email: string;
	password: string;
	nickname: string;
}

/**
 * POST /api/test/create-users
 * 測試環境專用：批量創建已驗證的測試用戶
 * 只在開發環境和測試環境中可用
 */
export async function POST({ request }: RequestEvent) {
	// 只在開發環境中允許使用此端點
	if (!dev && process.env.NODE_ENV !== 'test') {
		return json({ message: '此端點僅在測試環境中可用' }, { status: 403 });
	}

	try {
		const { users } = (await request.json()) as { users: CreateUserRequest[] };

		if (!users || !Array.isArray(users) || users.length === 0) {
			return json({ message: '缺少 users 參數或格式不正確' }, { status: 400 });
		}

		const createdUsers: string[] = [];
		const existingUsers: string[] = [];

		for (const userData of users) {
			const { email, password, nickname } = userData;

			if (!email || !password || !nickname) {
				continue;
			}

			const normalizedEmail = email.toLowerCase().trim();

			// 檢查用戶是否已存在
			const existingUser = await db
				.select()
				.from(user)
				.where(eq(user.email, normalizedEmail))
				.limit(1);

			if (existingUser.length > 0) {
				existingUsers.push(normalizedEmail);
				console.log(`ℹ️  [測試] 用戶已存在: ${normalizedEmail}`);
				continue;
			}

			// 創建新用戶（已驗證）
			const passwordHash = await hashPassword(password);

			await db.insert(user).values({
				email: normalizedEmail,
				nickname: nickname,
				passwordHash: passwordHash,
				emailVerified: true, // 直接設為已驗證
				emailVerificationToken: null,
				emailVerificationTokenExpiresAt: null,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			createdUsers.push(normalizedEmail);
			console.log(`✅ [測試] 已創建並驗證用戶: ${normalizedEmail}`);
		}

		return json(
			{
				message: '批量創建用戶完成',
				created: createdUsers,
				existing: existingUsers,
				total: createdUsers.length + existingUsers.length
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('批量創建用戶錯誤:', error);
		return json({ message: '伺服器錯誤', error: String(error) }, { status: 500 });
	}
}
