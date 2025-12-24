export const load = async ({ locals }) => {
	// 不設定全域 Cache-Control，讓頁面可以正常快取以提升效能
	// 登出後的快取問題已透過以下機制處理：
	// 1. /api/auth/logout 會清除伺服器端的 cookie
	// 2. +page.svelte 的 pageshow 事件會檢測快取恢復並重新載入
	// 3. logout() 使用 location.replace() 防止返回

	return {
		user: locals.user
	};
};
