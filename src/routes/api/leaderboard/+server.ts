import { json } from '@sveltejs/kit';
import { getLeaderboard } from '$lib/server/leaderboard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const result = await getLeaderboard(url.searchParams.get('role'));
	return json(result, { headers: { 'Cache-Control': 'no-store' } });
};
