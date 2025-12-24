export const load = async ({ locals, setHeaders }) => {
	// 設定 Cache-Control header 防止瀏覽器快取造成登出後返回的問題
	// 這確保使用者按返回鈕時，頁面會重新載入而不是從快取恢復
	setHeaders({
		'Cache-Control': 'no-cache, no-store, must-revalidate',
		Pragma: 'no-cache',
		Expires: '0'
	});

	return {
		user: locals.user
	};
};
