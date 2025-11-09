import { redirect } from '@sveltejs/kit';
import { google } from '$lib/server/lucia';
import { generateState, generateCodeVerifier } from 'arctic';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	// 建立 Google OAuth 授權 URL
	const url = google.createAuthorizationURL(state, codeVerifier, ['profile', 'email']);

	console.log('🔐 開始 Google OAuth 流程');
	console.log('   State:', state.substring(0, 10) + '...');
	console.log('   Redirect URI:', url.searchParams.get('redirect_uri'));

	// 將 state 和 code verifier 儲存在 cookie 中
	// 針對 Safari 優化: 使用 None 而非 Lax，並確保 secure 在開發環境也啟用
	cookies.set('google_oauth_state', state, {
		path: '/',
		secure: true, // Safari 需要 secure cookies，即使在 localhost
		httpOnly: true,
		maxAge: 60 * 10, // 10 分鐘
		sameSite: 'none' // Safari 跨站請求需要 'none'
	});

	cookies.set('google_oauth_code_verifier', codeVerifier, {
		path: '/',
		secure: true, // Safari 需要 secure cookies，即使在 localhost
		httpOnly: true,
		maxAge: 60 * 10, // 10 分鐘
		sameSite: 'none' // Safari 跨站請求需要 'none'
	});

	console.log('   ✓ OAuth cookies 已設定 (有效期: 10分鐘, Safari 兼容模式)');

	// 重定向到 Google 授權頁面
	throw redirect(302, url.toString());
};
