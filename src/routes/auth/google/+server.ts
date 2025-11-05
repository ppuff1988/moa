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
	cookies.set('google_oauth_state', state, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10, // 10 分鐘
		sameSite: 'lax'
	});

	cookies.set('google_oauth_code_verifier', codeVerifier, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10, // 10 分鐘
		sameSite: 'lax'
	});

	console.log('   ✓ OAuth cookies 已設定 (有效期: 10分鐘)');

	// 重定向到 Google 授權頁面
	throw redirect(302, url.toString());
};
