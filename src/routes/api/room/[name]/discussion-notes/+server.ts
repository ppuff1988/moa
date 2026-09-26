import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { getNotes, parseRound, privateHeaders, saveNote } from '$lib/server/game-discussion';
import { parseNotePatch } from '$lib/utils/discussion';

export const GET: RequestHandler = async ({ request, params, url, setHeaders }) => {
	setHeaders(privateHeaders);
	const result = await verifyPlayerInRoom(request, params.name);
	if ('error' in result) return result.error;
	const round = parseRound(url.searchParams.get('round'));
	if (round === undefined) return json({ message: '請指定回合' }, { status: 400 });
	return json({ notes: await getNotes(result.game.id, result.player.id, round) });
};
export const PATCH: RequestHandler = async ({ request, params, setHeaders }) => {
	setHeaders(privateHeaders);
	const result = await verifyPlayerInRoom(request, params.name);
	if ('error' in result) return result.error;
	let patch;
	try {
		const body = await request.text();
		if (body.length > 4096) throw new Error('too large');
		patch = parseNotePatch(JSON.parse(body));
	} catch {
		return json({ message: '筆記格式不正確，備註最多 500 字' }, { status: 400 });
	}
	const saved = await saveNote(result.game.id, result.player.id, patch);
	return json(saved, { status: saved.conflict ? 409 : 200 });
};
