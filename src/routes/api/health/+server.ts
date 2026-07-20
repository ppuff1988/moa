import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

const READINESS_TIMEOUT_MS = 3000;

export const GET: RequestHandler = async () => {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	try {
		await Promise.race([
			db.execute(sql`SELECT 1`),
			new Promise((_, reject) => {
				timeout = setTimeout(
					() => reject(new Error('database readiness timeout')),
					READINESS_TIMEOUT_MS
				);
			})
		]);

		return healthResponse(200, 'ok');
	} catch {
		return healthResponse(503, 'unavailable');
	} finally {
		if (timeout) clearTimeout(timeout);
	}
};

function healthResponse(status: number, healthStatus: 'ok' | 'unavailable'): Response {
	return new Response(
		JSON.stringify({
			status: healthStatus,
			timestamp: new Date().toISOString(),
			service: 'moa',
			checks: { database: healthStatus }
		}),
		{
			status,
			headers: { 'Content-Type': 'application/json' }
		}
	);
}
