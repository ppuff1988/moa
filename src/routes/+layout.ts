import { env } from '$env/dynamic/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
	return {
		gtmId: env.PUBLIC_GTM_ID || '',
		title: 'MOA - 古董局中局線上桌遊',
		description: '古董局中局桌遊線上版，無需下載 App 或註冊微信，打開瀏覽器即可開始遊戲。',
		keywords: '古董局中局,桌遊,線上遊戲,策略遊戲,推理遊戲,Board Game,MOA',
		seo: {
			siteName: 'MOA - 古董局中局桌遊',
			url: 'https://moa.sportify.tw'
		}
	};
};
