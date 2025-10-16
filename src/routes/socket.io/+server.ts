// Socket.IO 服務器端點
import type { RequestHandler } from './$types';

// 在 SvelteKit 開發環境中，Socket.IO 通過 polling 模式工作
// 這個端點只是確認 Socket.IO 可用
export const GET: RequestHandler = async () => {
	return new Response('Socket.IO endpoint is available', {
		status: 200,
		headers: {
			'Content-Type': 'text/plain'
		}
	});
};

export const POST: RequestHandler = async () => {
	return new Response('Socket.IO endpoint is available', {
		status: 200,
		headers: {
			'Content-Type': 'text/plain'
		}
	});
};
