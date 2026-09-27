import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { getDiscussion, parseRound, privateHeaders } from '$lib/server/game-discussion';

export const GET: RequestHandler = async ({ request, params, url, setHeaders }) => {
	setHeaders(privateHeaders);
	const result = await verifyPlayerInRoom(request, params.name);
	if ('error' in result) return result.error;
	return json(
		await getDiscussion(result.game, result.player.id, parseRound(url.searchParams.get('round')))
	);
};
