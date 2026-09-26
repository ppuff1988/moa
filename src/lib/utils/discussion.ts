import type { DiscussionNote, NoteChange, NotePatch } from '$lib/types/discussion';

export const claimLabels = { genuine: '真', fake: '偽', unable: '無法鑑定' } as const;
export const alignmentOptions = ['good', 'unknown', 'bad'] as const;
export const alignmentLabels = { good: '偏好人', unknown: '未判斷', bad: '偏壞人' } as const;
export function emptyNote(subjectPlayerId: number): DiscussionNote {
	return {
		subjectPlayerId,
		artifactClaims: {},
		claimedAttacked: false,
		alignment: 'unknown',
		memo: '',
		version: 0
	};
}
export function applyNoteChange(note: DiscussionNote, change: NoteChange): DiscussionNote {
	if (change.field === 'claimedAttacked' && change.value)
		return { ...note, claimedAttacked: true, artifactClaims: {} };
	if (change.field !== 'artifact') return { ...note, [change.field]: change.value };
	const artifactClaims = note.claimedAttacked ? {} : { ...note.artifactClaims };
	if (change.value === null) delete artifactClaims[change.artifactId];
	else artifactClaims[change.artifactId] = change.value;
	return { ...note, artifactClaims, claimedAttacked: false };
}
export function parseNotePatch(input: unknown): NotePatch {
	const invalid = () => {
		throw new Error('筆記格式不正確，備註最多 500 字');
	};
	if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
	const data = input as Record<string, unknown>;
	if (
		Object.keys(data).some(
			(key) => !['round', 'subjectPlayerId', 'expectedVersion', 'change'].includes(key)
		)
	)
		return invalid();
	if (
		!Number.isInteger(data.round) ||
		Number(data.round) < 1 ||
		Number(data.round) > 3 ||
		!Number.isSafeInteger(data.subjectPlayerId) ||
		Number(data.subjectPlayerId) <= 0 ||
		!Number.isSafeInteger(data.expectedVersion) ||
		Number(data.expectedVersion) < 0
	)
		return invalid();
	if (!data.change || typeof data.change !== 'object' || Array.isArray(data.change))
		return invalid();
	const change = data.change as Record<string, unknown>;
	const allowed =
		change.field === 'artifact' ? ['field', 'artifactId', 'value'] : ['field', 'value'];
	if (Object.keys(change).some((key) => !allowed.includes(key))) return invalid();
	if (change.field === 'artifact') {
		if (
			!Number.isSafeInteger(change.artifactId) ||
			Number(change.artifactId) <= 0 ||
			(change.value !== null &&
				(typeof change.value !== 'string' || !['genuine', 'fake', 'unable'].includes(change.value)))
		)
			return invalid();
	} else if (change.field === 'claimedAttacked') {
		if (typeof change.value !== 'boolean') return invalid();
	} else if (change.field === 'memo') {
		if (typeof change.value !== 'string' || change.value.length > 500) return invalid();
	} else if (change.field === 'alignment') {
		if (!alignmentOptions.some((value) => value === change.value)) return invalid();
	} else return invalid();
	return data as unknown as NotePatch;
}

export function zodiacImage(animal: string) {
	const index =
		['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'].indexOf(animal) + 1;
	return `/zodiac/zodiac_${String(index).padStart(2, '0')}.png`;
}
