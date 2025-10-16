import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// XSS 防護：清理字串中的 HTML 標籤和危險協議
function sanitizeString(str: string): string {
	if (!str) return str;
	return str
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;')
		.replace(/\//g, '&#x2F;')
		.replace(/javascript:/gi, '') // 移除 javascript: 協議
		.replace(/data:/gi, '') // 移除 data: 協議
		.replace(/vbscript:/gi, '') // 移除 vbscript: 協議
		.replace(/on\w+\s*=/gi, ''); // 移除事件處理器
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: '未授權' }, { status: 401 });
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { passwordHash, ...userWithoutPassword } = locals.user;

	// 清理暱稱中的潛在 XSS 攻擊
	const sanitizedUser = {
		...userWithoutPassword,
		nickname: sanitizeString(userWithoutPassword.nickname),
		email: userWithoutPassword.email // email 不需要清理，因為已經過驗證
	};

	return json(sanitizedUser, { status: 200 });
};
