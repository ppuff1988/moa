import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	// JWT 是無狀態的，所以伺服器端不需要做任何事情
	// 前端會負責刪除儲存的 token
	return json({ message: '登出成功' }, { status: 200 });
};
