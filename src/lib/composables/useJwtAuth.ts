/**
 * JWT Authentication Composable
 *
 * 提供 JWT token 管理和 API 調用功能
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// JWT token store
const jwtTokenStore = writable<string | null>(null);

// Token key for localStorage
const TOKEN_KEY = 'moa_jwt_token';

/**
 * 初始化 JWT token（從 localStorage 讀取）
 */
export function initJwtToken() {
	if (browser) {
		const savedToken = localStorage.getItem(TOKEN_KEY);
		if (savedToken) {
			jwtTokenStore.set(savedToken);
		}
	}
}

/**
 * 保存 JWT token
 */
export function setJwtToken(token: string) {
	jwtTokenStore.set(token);
	if (browser) {
		localStorage.setItem(TOKEN_KEY, token);
	}
}

/**
 * 清除 JWT token
 */
export function clearJwtToken() {
	jwtTokenStore.set(null);
	if (browser) {
		localStorage.removeItem(TOKEN_KEY);
	}
}

/**
 * 取得當前的 JWT token
 */
export function getJwtToken(): string | null {
	return get(jwtTokenStore);
}

/**
 * 訂閱 JWT token 變化
 */
export const jwtToken = {
	subscribe: jwtTokenStore.subscribe
};

/**
 * 交換 JWT token
 * 將當前的 Lucia session 轉換為 JWT token
 */
export async function exchangeJwtToken(): Promise<{
	success: boolean;
	token?: string;
	user?: {
		id: number;
		email: string;
		nickname: string;
	};
	message?: string;
}> {
	try {
		const response = await fetch('/api/auth/exchange-jwt', {
			method: 'POST',
			credentials: 'include' // 確保帶上 session cookie
		});

		const data = await response.json();

		if (data.success && data.data?.token) {
			// 自動保存 token
			setJwtToken(data.data.token);
		}

		return {
			success: data.success,
			token: data.data?.token,
			user: data.data?.user,
			message: data.message
		};
	} catch (error) {
		console.error('Exchange JWT token failed:', error);
		return {
			success: false,
			message: '網絡錯誤，請稍後再試'
		};
	}
}

/**
 * 使用 JWT token 調用 API
 */
export async function fetchWithJwt(url: string, options: RequestInit = {}): Promise<Response> {
	const token = getJwtToken();

	const headers = new Headers(options.headers);
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	return fetch(url, {
		...options,
		headers
	});
}

/**
 * 檢查是否有有效的 JWT token
 */
export function hasJwtToken(): boolean {
	return getJwtToken() !== null;
}
