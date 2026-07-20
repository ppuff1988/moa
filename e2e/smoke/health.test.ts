import { expect, test } from '@playwright/test';

test('liveness 與 database readiness 正常', async ({ request }) => {
	const liveness = await request.get('/api/health/live');
	expect(liveness.status()).toBe(200);
	expect(await liveness.json()).toMatchObject({ status: 'ok', service: 'moa' });

	const readiness = await request.get('/api/health');
	expect(readiness.status()).toBe(200);
	expect(await readiness.json()).toMatchObject({
		status: 'ok',
		service: 'moa',
		checks: { database: 'ok' }
	});
});
