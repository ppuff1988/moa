import { goto } from '$app/navigation';
import { getJWTToken } from './jwt';

/**
 * 離開房間的通用函數
 * @param roomName 房間名稱
 * @returns Promise<boolean> 是否成功離開
 */
export async function leaveRoom(roomName: string): Promise<boolean> {
	if (!confirm('確定要離開房間嗎？')) {
		return false;
	}

	try {
		const token = getJWTToken();
		if (!token) {
			alert('請先登入');
			return false;
		}

		const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/leave`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (response.ok) {
			alert('已成功離開房間');
			await goto('/', { invalidateAll: true });
			return true;
		} else {
			const data = await response.json();
			alert(data.message || '離開房間失敗');
			return false;
		}
	} catch (error) {
		console.error('離開房間錯誤:', error);
		alert('離開房間時發生錯誤');
		return false;
	}
}
