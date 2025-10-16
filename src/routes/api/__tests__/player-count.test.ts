import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { user, games, gamePlayers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5173';

describe('Player Count Issue - Room Creation', () => {
	let authToken: string;
	let testEmail: string;
	let roomName: string;
	let gameId: string;

	beforeAll(async () => {
		// 創建測試用戶
		testEmail = `player-count-test-${Date.now()}@example.com`;
		const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: testEmail,
				nickname: 'Player Count Test',
				password: 'TestPassword123!',
				confirmPassword: 'TestPassword123!'
			})
		});

		const registerData = await registerResponse.json();
		authToken = registerData.token;
		// roomName 將在測試中從 API 響應獲取
	});

	afterAll(async () => {
		// 清理測試數據
		try {
			if (gameId) {
				await db.delete(gamePlayers).where(eq(gamePlayers.gameId, gameId));
				await db.delete(games).where(eq(games.id, gameId));
			}
			await db.delete(user).where(eq(user.email, testEmail));
		} catch (error) {
			console.error('清理測試數據失敗:', error);
		}
	});

	it('房主創建房間後，應該立即顯示 1/6 玩家（而非 0/6）', async () => {
		// 1. 創建房間（不需要提供roomName，系統自動生成）
		const createResponse = await fetch(`${API_BASE}/api/room/create`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${authToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				password: 'test123'
			})
		});

		expect(createResponse.status).toBe(201);
		const createData = await createResponse.json();
		gameId = createData.gameId;
		roomName = createData.roomName; // 使用API返回的自動生成房間名稱

		// 2. 獲取房間信息（模擬前端頁面加載時的 API 調用）
		const roomResponse = await fetch(`${API_BASE}/api/room/${encodeURIComponent(roomName)}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${authToken}`
			}
		});

		expect(roomResponse.status).toBe(200);
		const roomData = await roomResponse.json();

		// 3. 驗證：playerCount 應該是 1
		expect(roomData.game.playerCount).toBe(1);

		// 4. 驗證：players 數組長度應該是 1
		expect(roomData.players).toHaveLength(1);

		// 5. 驗證：玩家數據完整性
		expect(roomData.players[0]).toHaveProperty('id');
		expect(roomData.players[0]).toHaveProperty('userId');
		expect(roomData.players[0]).toHaveProperty('nickname', 'Player Count Test');
		expect(roomData.players[0]).toHaveProperty('isHost', true);
	});
});
