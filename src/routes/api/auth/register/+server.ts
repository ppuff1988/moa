import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/password';
import { generateJWT, type JWTPayload } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// 檢查 Content-Type
		const contentType = request.headers.get('content-type');
		if (!contentType || !contentType.includes('application/json')) {
			return json({ message: '請求格式錯誤，需要 JSON 格式' }, { status: 400 });
		}

		// 安全解析 JSON
		let body;
		try {
			const text = await request.text();
			body = JSON.parse(text);
		} catch (parseError) {
			console.error('JSON 解析錯誤:', parseError);
			return json({ message: 'JSON 格式錯誤' }, { status: 400 });
		}

		const { email, password, nickname, confirmPassword } = body;

		// 驗證輸入
		if (!email || !password || !nickname) {
			return json({ message: '請填寫所有必填欄位' }, { status: 400 });
		}

		// 檢查密碼確認
		if (confirmPassword && password !== confirmPassword) {
			return json({ message: '密碼不一致' }, { status: 400 });
		}

		// 更嚴格的 Email 驗證，防止 XSS 攻擊
		// 1. 檢查是否包含危險字符
		const dangerousChars = /[<>'"(){}[\]\\]/;
		if (dangerousChars.test(email)) {
			return json({ message: '請輸入有效的 Email 格式' }, { status: 400 });
		}

		// 2. 標準 Email 格式驗證
		const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		if (!emailRegex.test(email)) {
			return json({ message: '請輸入有效的 Email 格式' }, { status: 400 });
		}

		// 密碼驗證
		// 檢查是否只包含空白字符
		if (password.trim().length === 0) {
			return json({ message: '密碼不能只包含空白字符' }, { status: 400 });
		}

		if (password.length < 6) {
			return json({ message: '密碼至少需要 6 個字元' }, { status: 400 });
		}

		if (password.length > 100) {
			return json({ message: '密碼最多 100 個字元' }, { status: 400 });
		}

		// 暱稱驗證
		if (nickname.length < 2) {
			return json({ message: '暱稱至少需要 2 個字元' }, { status: 400 });
		}

		if (nickname.length > 50) {
			return json({ message: '暱稱最多 50 個字元' }, { status: 400 });
		}

		// 檢查 nickname 中的危險 HTML/Script 標籤
		if (/<script|<\/script|javascript:|onerror=|onload=/i.test(nickname)) {
			return json({ message: '暱稱包含不允許的內容' }, { status: 400 });
		}

		// Email 轉為小寫
		const normalizedEmail = email.toLowerCase().trim();

		// 檢查 Email 是否已存在（使用正規化後的 email）
		const existingUser = await db
			.select()
			.from(user)
			.where(eq(user.email, normalizedEmail))
			.limit(1);

		if (existingUser.length > 0) {
			return json({ message: 'Email 已被使用' }, { status: 400 });
		}

		// 建立新使用者
		const passwordHash = await hashPassword(password);

		// 插入用戶資料（使用正規化的 email）
		const [newUser] = await db
			.insert(user)
			.values({
				email: normalizedEmail,
				nickname,
				passwordHash
			})
			.returning();

		// 生成 JWT token（使用正規化的 email）
		const jwtPayload: JWTPayload = {
			userId: newUser.id,
			email: normalizedEmail
		};
		const token = generateJWT(jwtPayload);

		return json(
			{
				message: '註冊成功',
				token,
				user: {
					id: newUser.id,
					email: newUser.email,
					nickname: newUser.nickname
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('註冊錯誤:', error);
		return json({ message: '伺服器錯誤，請稍後再試' }, { status: 500 });
	}
};
