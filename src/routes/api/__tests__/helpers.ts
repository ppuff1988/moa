/**
 * API 測試輔助工具
 */

export const API_BASE = process.env.API_BASE_URL || 'http://localhost:5173';

/**
 * 創建測試用戶
 */
export async function createTestUser(suffix: string = '') {
	const email = `test-${Date.now()}${suffix}@example.com`;
	const password = 'TestPassword123!';

	const response = await fetch(`${API_BASE}/api/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email,
			nickname: `Test User ${suffix}`,
			password,
			confirmPassword: password
		})
	});

	if (!response.ok) {
		throw new Error(`Failed to create test user: ${await response.text()}`);
	}

	const data = await response.json();
	return {
		email,
		password,
		token: data.token,
		userId: data.user.id,
		user: data.user
	};
}

/**
 * 登入測試用戶
 */
export async function loginTestUser(email: string, password: string) {
	const response = await fetch(`${API_BASE}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});

	if (!response.ok) {
		throw new Error(`Failed to login: ${await response.text()}`);
	}

	return await response.json();
}

/**
 * 創建測試房間
 */
export async function createTestRoom(authToken: string) {
	const password = 'room123';

	const response = await fetch(`${API_BASE}/api/room/create`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${authToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ password })
	});

	if (!response.ok) {
		throw new Error(`Failed to create room: ${await response.text()}`);
	}

	const data = await response.json();
	return {
		roomName: data.roomName, // 使用API返回的自動生成房間名稱
		password,
		gameId: data.gameId,
		data
	};
}

/**
 * 加入測試房間
 */
export async function joinTestRoom(authToken: string, roomName: string, password: string) {
	const response = await fetch(`${API_BASE}/api/room/join`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${authToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ roomName, password })
	});

	if (!response.ok) {
		throw new Error(`Failed to join room: ${await response.text()}`);
	}

	return await response.json();
}

/**
 * 獲取房間資訊
 */
export async function getRoomInfo(authToken: string, roomName: string) {
	const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(roomName)}`, {
		headers: { Authorization: `Bearer ${authToken}` }
	});

	if (!response.ok) {
		throw new Error(`Failed to get room info: ${await response.text()}`);
	}

	return await response.json();
}

/**
 * 踢出玩家
 */
export async function kickPlayer(authToken: string, roomName: string, targetUserId: number) {
	const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(roomName)}/kick`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${authToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ targetUserId })
	});

	if (!response.ok) {
		throw new Error(`Failed to kick player: ${await response.text()}`);
	}

	return await response.json();
}

/**
 * 等待一段時間
 */
export function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成隨機字符串
 */
export function randomString(length: number = 8) {
	return Math.random()
		.toString(36)
		.substring(2, 2 + length);
}

/**
 * 清理數據庫中的測試數據
 */
export async function cleanupTestData(
	db: unknown,
	tables: unknown,
	conditions: { table: unknown; where: unknown }[]
) {
	try {
		for (const { table, where } of conditions) {
			await (db as { delete: (t: unknown) => { where: (w: unknown) => Promise<void> } })
				.delete(table)
				.where(where);
		}
	} catch (error) {
		console.error('Failed to cleanup test data:', error);
	}
}
