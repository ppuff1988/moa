import { writable } from 'svelte/store';
import type { DiscussionNote, NoteChange, NotePatch } from '$lib/types/discussion';
import { applyNoteChange, emptyNote, parseNotePatch } from '$lib/utils/discussion';

export interface NoteEntry {
	note: DiscussionNote;
	status: 'saved' | 'saving' | 'error' | 'conflict';
	message?: string;
	cloud?: DiscussionNote;
}
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Save = (patch: NotePatch) => Promise<{ note: DiscussionNote; conflict: boolean }>;

export function createDiscussionNotes(scope: string, save: Save, storage?: DraftStorage) {
	const state = writable<Record<string, NoteEntry>>({});
	const entries: Record<string, NoteEntry> = {};
	const queues = new Map<string, NoteChange[]>();
	const timers = new Map<string, ReturnType<typeof setTimeout>>();
	const running = new Set<string>();
	let destroyed = false;
	const keyOf = (round: number, id: number) => `${round}:${id}`;
	const storageKey = (key: string) => `moa:discussion:${scope}:${key}`;
	const publish = () => state.set({ ...entries });

	function persist(key: string) {
		try {
			const changes = queues.get(key) ?? [];
			if (changes.length)
				storage?.setItem(
					storageKey(key),
					JSON.stringify({
						version: entries[key].note.version,
						changes
					})
				);
			else storage?.removeItem(storageKey(key));
		} catch {
			/* Server saving still works when browser storage is unavailable. */
		}
	}

	async function flush(round: number, id: number) {
		const key = keyOf(round, id);
		if (destroyed || running.has(key) || entries[key]?.status === 'conflict') return;
		clearTimeout(timers.get(key));
		timers.delete(key);
		const queue = queues.get(key);
		if (!queue?.length) return;
		running.add(key);
		entries[key] = { ...entries[key], status: 'saving', message: undefined };
		publish();
		try {
			while (queue.length) {
				const response = await save({
					round,
					subjectPlayerId: id,
					expectedVersion: entries[key].note.version,
					change: queue[0]
				});
				if (response.conflict) {
					entries[key] = { ...entries[key], status: 'conflict', cloud: response.note };
					break;
				}
				queue.shift();
				// Reapply pending edits onto the confirmed server version, never the reverse.
				const note = queue.reduce(applyNoteChange, response.note);
				entries[key] = { note, status: queue.length ? 'saving' : 'saved' };
				persist(key);
				publish();
				if (destroyed) break;
			}
		} catch (err) {
			entries[key] = {
				...entries[key],
				status: 'error',
				message: err instanceof Error ? err.message : '尚未同步，請重試'
			};
		} finally {
			running.delete(key);
			persist(key);
			publish();
		}
	}

	function load(round: number, notes: DiscussionNote[]) {
		for (const note of notes) {
			const key = keyOf(round, note.subjectPlayerId);
			if (entries[key]) continue;
			entries[key] = { note, status: 'saved' };
			try {
				const raw = storage?.getItem(storageKey(key));
				if (!raw) continue;
				const draft = JSON.parse(raw);
				if (!Array.isArray(draft.changes) || !Number.isSafeInteger(draft.version)) continue;
				const changes: NoteChange[] = draft.changes.map(
					(change: unknown) =>
						parseNotePatch({
							round,
							subjectPlayerId: note.subjectPlayerId,
							expectedVersion: draft.version,
							change
						}).change
				);
				if (!changes.length) continue;
				queues.set(key, changes);
				entries[key] = {
					// Keep the draft's base version until the user explicitly resolves the conflict.
					note: changes.reduce(applyNoteChange, { ...note, version: draft.version }),
					status: draft.version === note.version ? 'error' : 'conflict',
					cloud: note,
					message: '有尚未同步的草稿，請重試'
				};
			} catch {
				try {
					storage?.removeItem(storageKey(key));
				} catch {
					/* Storage unavailable. */
				}
			}
		}
		publish();
	}

	function edit(round: number, id: number, change: NoteChange, debounce = false) {
		if (destroyed) return;
		const key = keyOf(round, id);
		const entry = entries[key] ?? { note: emptyNote(id), status: 'saved' as const };
		entries[key] = {
			...entry,
			note: applyNoteChange(entry.note, change),
			status: entry.status === 'conflict' ? 'conflict' : 'saving'
		};
		const queue = queues.get(key) ?? [];
		// Keep the in-flight patch intact; coalesce only unsent consecutive memo edits.
		if (
			change.field === 'memo' &&
			queue.length > (running.has(key) ? 1 : 0) &&
			queue.at(-1)?.field === 'memo'
		)
			queue[queue.length - 1] = change;
		else queue.push(change);
		queues.set(key, queue);
		persist(key);
		publish();
		clearTimeout(timers.get(key));
		if (debounce)
			timers.set(
				key,
				setTimeout(() => void flush(round, id), 500)
			);
		else void flush(round, id);
	}

	function resolve(round: number, id: number, choice: 'cloud' | 'mine') {
		const key = keyOf(round, id);
		const cloud = entries[key]?.cloud;
		if (!cloud) return;
		if (choice === 'cloud') {
			queues.set(key, []);
			entries[key] = { note: cloud, status: 'saved' };
		} else {
			entries[key] = {
				note: (queues.get(key) ?? []).reduce(applyNoteChange, cloud),
				status: 'saving'
			};
			void flush(round, id);
		}
		persist(key);
		publish();
	}

	return {
		subscribe: state.subscribe,
		load,
		edit,
		resolve,
		retry: (round: number, id: number) => void flush(round, id),
		destroy() {
			destroyed = true;
			for (const timer of timers.values()) clearTimeout(timer);
			for (const key of Object.keys(entries)) persist(key);
		}
	};
}
