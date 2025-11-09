// JWT token 管理工具函式

/**
 * 從 cookie 中獲取指定名稱的值
 */
function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) {
		const cookieValue = parts.pop()?.split(';').shift();
		return cookieValue || null;
	}
	return null;
}

export function getJWTToken(): string | null {
	if (typeof window === 'undefined') return null;

	// 優先從 localStorage 讀取
	const localToken = localStorage.getItem('jwt_token');
	if (localToken) return localToken;

	// 如果 localStorage 沒有，從 cookie 中讀取
	const cookieToken = getCookie('jwt');
	if (cookieToken) {
		// 同步到 localStorage，方便後續使用
		localStorage.setItem('jwt_token', cookieToken);
		return cookieToken;
	}

	return null;
}

export function setJWTToken(token: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem('jwt_token', token);
	document.cookie = `jwt=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function removeJWTToken(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem('jwt_token');
	document.cookie = 'jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function getAuthHeaders(): Record<string, string> {
	const token = getJWTToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function logout(): Promise<void> {
	try {
		await fetch('/api/auth/logout', {
			method: 'POST',
			headers: getAuthHeaders()
		});
	} catch (error) {
		console.error('登出錯誤:', error);
	} finally {
		removeJWTToken();
		// 清除所有 localStorage
		if (typeof window !== 'undefined') {
			localStorage.clear();
		}
		window.location.href = '/auth/login';
	}
}
