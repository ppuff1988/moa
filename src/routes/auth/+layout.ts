import type { LayoutLoad } from './$types';

const metadataByPath: Record<string, { title: string; description: string }> = {
	'/auth/login': {
		title: '登入｜古董局中局',
		description: '登入古董局中局非官方APP，與好友一起體驗策略與推理的樂趣。'
	},
	'/auth/register': {
		title: '註冊｜古董局中局',
		description: '註冊古董局中局非官方APP帳號，免費使用線上桌遊輔助工具。'
	},
	'/auth/forgot-password': {
		title: '忘記密碼｜古董局中局',
		description: '申請重設古董局中局非官方APP的登入密碼。'
	},
	'/auth/reset-password': {
		title: '重設密碼｜古董局中局',
		description: '設定新的古董局中局非官方APP登入密碼。'
	},
	'/auth/oauth-success': {
		title: '登入成功｜古董局中局',
		description: '古董局中局非官方APP第三方帳號登入成功。'
	},
	'/auth/oauth-error': {
		title: '登入失敗｜古董局中局',
		description: '古董局中局非官方APP第三方帳號登入失敗。'
	}
};

export const load: LayoutLoad = ({ url }) =>
	metadataByPath[url.pathname] ?? {
		title: '帳號驗證｜古董局中局',
		description: '古董局中局非官方APP帳號驗證。'
	};
