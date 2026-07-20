import { describe, expect, it, vi } from 'vitest';

const { executeMock } = vi.hoisted(() => ({
	executeMock: vi.fn().mockRejectedValue(new Error('database unavailable'))
}));

vi.mock('$lib/server/db', () => ({
	db: { execute: executeMock }
}));

import { GET as getReadiness } from './+server';

describe('health endpoints', () => {
	it('readiness 在資料庫無法連線時回傳 503', async () => {
		const response = await getReadiness({} as Parameters<typeof getReadiness>[0]);

		expect(response.status).toBe(503);
	});

	it('liveness 不依賴資料庫連線', async () => {
		const liveModule = await import('./live/+server').catch(() => null);

		expect(liveModule).not.toBeNull();
		if (!liveModule) return;

		const response = await liveModule.GET({} as Parameters<typeof liveModule.GET>[0]);
		expect(response.status).toBe(200);
	});
});
