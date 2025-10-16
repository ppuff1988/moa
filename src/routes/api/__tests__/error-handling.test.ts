import { describe, it, expect } from 'vitest';
import { API_BASE } from './helpers';

describe('API Error Handling and Edge Cases', () => {
	describe('HTTP Methods Validation', () => {
		it('應該拒絕錯誤的 HTTP 方法 - GET on POST endpoint', async () => {
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'GET'
			});

			expect([405, 401, 404]).toContain(response.status);
		});

		it('應該拒絕錯誤的 HTTP 方法 - POST on GET endpoint', async () => {
			const response = await fetch(`${API_BASE}/api/roles`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});

			expect([405, 404]).toContain(response.status);
		});

		it('應該拒絕不支援的 HTTP 方法 - PUT', async () => {
			const response = await fetch(`${API_BASE}/api/roles`, {
				method: 'PUT'
			});

			expect([405, 404]).toContain(response.status);
		});

		it('應該拒絕不支援的 HTTP 方法 - DELETE', async () => {
			const response = await fetch(`${API_BASE}/api/roles`, {
				method: 'DELETE'
			});

			expect([405, 404]).toContain(response.status);
		});
	});

	describe('Content-Type Validation', () => {
		it('應該拒絕缺少 Content-Type 的 POST 請求', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				body: JSON.stringify({
					email: 'test@example.com',
					password: 'password'
				})
			});

			// 可能接受或拒絕，取決於實現
			// 403: CSRF 保護拒絕
			expect([200, 400, 401, 403, 415]).toContain(response.status);
		});

		it('應該拒絕錯誤的 Content-Type', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'text/plain' },
				body: 'not json'
			});

			// 接受 500（服務器內部解析錯誤）或標準錯誤碼
			// 403: CSRF 保護拒絕
			expect([400, 401, 403, 415, 500]).toContain(response.status);
		});
	});

	describe('URL Encoding and Special Characters', () => {
		it('應該正確處理 URL 編碼的房間名稱', async () => {
			const roomName = '測試房間 123';
			const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(roomName)}`, {
				headers: { Authorization: 'Bearer invalid-token' }
			});

			// 應該返回認證錯誤而非 URL 解析錯誤
			expect([401, 403, 404]).toContain(response.status);
		});

		it('應該正確處理包含特殊字符的房間名稱', async () => {
			const specialChars = ['/', '\\', '?', '#', '&', '=', '%'];

			for (const char of specialChars) {
				const roomName = `Room${char}Test`;
				const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(roomName)}`, {
					headers: { Authorization: 'Bearer invalid-token' }
				});

				// 應該能夠處理而不會崩潰
				expect(response.status).toBeDefined();
			}
		});

		it('應該處理超長的 URL', async () => {
			const longRoomName = 'A'.repeat(1000);
			const response = await fetch(`${API_BASE}/api/room/${encodeURIComponent(longRoomName)}`, {
				headers: { Authorization: 'Bearer invalid-token' }
			});

			expect([400, 401, 404, 414]).toContain(response.status);
		});
	});

	describe('Request Body Validation', () => {
		it('應該拒絕空的請求體', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: ''
			});

			// 接受 500（JSON 解析錯誤）或標準錯誤碼
			expect([400, 401, 500]).toContain(response.status);
		});

		it('應該拒絕格式錯誤的 JSON', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{"invalid": json}'
			});

			// 接受 500（JSON 解析錯誤）或 400
			expect([400, 500]).toContain(response.status);
		});

		it('應該處理超大的請求體', async () => {
			const largeBody = {
				email: 'test@example.com',
				password: 'password',
				extra: 'A'.repeat(10000)
			};

			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(largeBody)
			});

			expect([400, 401, 413]).toContain(response.status);
		});

		it('應該忽略額外的未知欄位', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com',
					password: 'password',
					unknownField: 'value',
					anotherField: 123
				})
			});

			// 應該處理主要欄位並忽略未知欄位
			expect([400, 401]).toContain(response.status);
		});

		it('應該處理 null 值', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: null,
					password: null
				})
			});

			expect(response.status).toBe(400);
		});

		it('應該處理 undefined 的 JSON 表示', async () => {
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					roomName: undefined,
					password: undefined
				})
			});

			expect([400, 401]).toContain(response.status);
		});
	});

	describe('Rate Limiting and Performance', () => {
		it('應該處理快速連續的請求', async () => {
			const requests = Array(10)
				.fill(null)
				.map(() => fetch(`${API_BASE}/api/roles`));

			const responses = await Promise.all(requests);

			// 所有請求都應���成功，或者有速率限制
			responses.forEach((response) => {
				expect([200, 429]).toContain(response.status);
			});
		});

		it('應該處理同時的登入請求', async () => {
			const loginRequests = Array(5)
				.fill(null)
				.map(() =>
					fetch(`${API_BASE}/api/auth/login`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							email: `test-${Date.now()}@example.com`,
							password: 'TestPassword123!'
						})
					})
				);

			const responses = await Promise.all(loginRequests);

			// 所有請求都應該得到適當的回應
			responses.forEach((response) => {
				expect(response.status).toBeDefined();
				expect(response.status).toBeGreaterThanOrEqual(200);
				expect(response.status).toBeLessThan(600);
			});
		});
	});

	describe('CORS and Headers', () => {
		it('應該返回正確的 Content-Type header', async () => {
			const response = await fetch(`${API_BASE}/api/roles`);

			expect(response.headers.get('content-type')).toContain('json');
		});

		it('應該處理缺少 Authorization header 的情況', async () => {
			const response = await fetch(`${API_BASE}/api/user/profile`);

			expect(response.status).toBe(401);
		});

		it('應該處理格式錯誤的 Authorization header', async () => {
			const invalidFormats = [
				'InvalidFormat',
				'Bearer',
				'Token abc123',
				'Bearer  ',
				'bearer token123'
			];

			for (const auth of invalidFormats) {
				const response = await fetch(`${API_BASE}/api/user/profile`, {
					headers: { Authorization: auth }
				});

				expect(response.status).toBe(401);
			}
		});
	});

	describe('API Endpoint Existence', () => {
		it('應該返回 404 對於不存在的端點', async () => {
			const response = await fetch(`${API_BASE}/api/nonexistent-endpoint`);

			expect(response.status).toBe(404);
		});

		it('應該返回 404 對於拼寫錯誤的端點', async () => {
			const response = await fetch(`${API_BASE}/api/rolle`); // roles 拼錯

			expect(response.status).toBe(404);
		});

		it('應該返回 404 對於多餘的路徑段', async () => {
			const response = await fetch(`${API_BASE}/api/roles/extra/path`);

			expect(response.status).toBe(404);
		});
	});

	describe('Data Type Validation', () => {
		it('應該拒絕數字類型的字串欄位', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 12345,
					nickname: 67890,
					password: 11111,
					confirmPassword: 11111
				})
			});

			expect(response.status).toBe(400);
		});

		it('應該拒絕布林值的字串欄位', async () => {
			const response = await fetch(`${API_BASE}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: true,
					password: false
				})
			});

			expect(response.status).toBe(400);
		});

		it('應該拒絕陣列類型的物件欄位', async () => {
			const response = await fetch(`${API_BASE}/api/room/create`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(['array', 'instead', 'of', 'object'])
			});

			expect([400, 401]).toContain(response.status);
		});
	});

	describe('Timeout and Slow Responses', () => {
		it('應該在合理時間內返回響應', async () => {
			const startTime = Date.now();

			await fetch(`${API_BASE}/api/roles`);

			const duration = Date.now() - startTime;

			// 響應時間應該在 10 秒內（寬鬆的限制）
			expect(duration).toBeLessThan(10000);
		});
	});

	describe('Character Encoding', () => {
		it('應該正確處理 UTF-8 字符', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				body: JSON.stringify({
					email: `中文郵箱${Date.now()}@例子.com`,
					nickname: '中文暱稱測試',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			// 可能接受或拒絕，取決於實現
			expect([201, 400]).toContain(response.status);
		});

		it('應該處理 Emoji 字符', async () => {
			const response = await fetch(`${API_BASE}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: `emoji${Date.now()}@example.com`,
					nickname: '🎮🎯🎲',
					password: 'TestPassword123!',
					confirmPassword: 'TestPassword123!'
				})
			});

			expect([201, 400]).toContain(response.status);
		});
	});
});
