/**
 * Email Queue Status API
 * 獲取郵件隊列狀態
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getQueueStatus } from '$lib/server/email-queue';

export const GET: RequestHandler = async () => {
	try {
		// 可選：檢查是否為管理員
		// if (!locals.user || locals.user.role !== 'admin') {
		// 	return json({ error: '無權限訪問' }, { status: 403 });
		// }

		const status = await getQueueStatus();

		if (!status) {
			return json({ error: '無法獲取隊列狀態' }, { status: 500 });
		}

		return json({
			success: true,
			data: status
		});
	} catch (error) {
		console.error('獲取隊列狀態失敗:', error);
		return json(
			{
				success: false,
				error: '獲取隊列狀態失敗'
			},
			{ status: 500 }
		);
	}
};
