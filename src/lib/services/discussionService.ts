import { getAuthHeaders } from '$lib/utils/jwt';
import type { DiscussionData, DiscussionNote, NotePatch } from '$lib/types/discussion';

export async function discussionRequest<T>(room: string, path: string, body?: unknown): Promise<T> {
	const response = await fetch(`/api/room/${encodeURIComponent(room)}/${path}`, {
		method: body === undefined ? 'GET' : 'PATCH',
		credentials: 'include',
		cache: 'no-store',
		headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const data = await response.json();
	if (!response.ok && !(response.status === 409 && data.conflict === true)) {
		throw new Error(data.message || '無法載入或儲存，請重試');
	}
	return data;
}
export const fetchDiscussion = (room: string, round?: number) =>
	discussionRequest<DiscussionData>(room, `discussion${round ? `?round=${round}` : ''}`);
export const fetchNotes = (room: string, round: number) =>
	discussionRequest<{ notes: DiscussionNote[] }>(room, `discussion-notes?round=${round}`);
export const saveDiscussionNote = (room: string, patch: NotePatch) =>
	discussionRequest<{ note: DiscussionNote; conflict: boolean }>(room, 'discussion-notes', patch);
