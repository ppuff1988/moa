import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { getSeating, privateHeaders, saveSeating } from '$lib/server/game-discussion';

export const GET: RequestHandler = async ({ request, params, setHeaders }) => {
	setHeaders(privateHeaders);
	const result = await verifyPlayerInRoom(request, params.name);
	if ('error' in result) return result.error;
	return json(await getSeating(result.game));
};
export const PATCH: RequestHandler = async ({ request, params, setHeaders }) => {
	setHeaders(privateHeaders);
	const result = await verifyPlayerInRoom(request, params.name);
	if ('error' in result) return result.error;
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ message: '無效的座位格式' }, { status: 400 });
	}
	if (!body || typeof body !== 'object' || Object.keys(body).some((key) => key !== 'seatOrder')) {
		return json({ message: '無效的座位格式' }, { status: 400 });
	}
	return json(await saveSeating(result.game.id, result.user.id, body.seatOrder));
};
