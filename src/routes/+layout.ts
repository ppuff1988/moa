import { env } from '$env/dynamic/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
	return {
		gtmId: env.PUBLIC_GTM_ID || '',
		title: '古董局中局非官方APP - 免費線上桌遊輔助工具',
		description:
			'古董局中局非官方APP，免費線上桌遊輔助工具，無需下載應用程式，打開瀏覽器即可開始遊戲',
		keywords:
			'古董局中局,古董局中局非官方APP,桌遊,線上遊戲,策略遊戲,推理遊戲,Board Game,免費桌遊,網頁遊戲',
		seo: {
			siteName: '古董局中局非官方APP',
			url: 'https://moa.sportify.tw'
		}
	};
};
