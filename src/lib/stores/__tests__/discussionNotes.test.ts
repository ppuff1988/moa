import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createDiscussionNotes } from '../discussionNotes';
import { applyNoteChange, emptyNote } from '$lib/utils/discussion';
import type { DiscussionNote, NotePatch } from '$lib/types/discussion';

describe('private notes autosave', () => {
	afterEach(() => vi.useRealTimers());
	it('keeps a newer alignment when an older save returns and isolates rounds', async () => {
		const pending: Array<(value: { note: DiscussionNote; conflict: boolean }) => void> = [];
		const store = createDiscussionNotes(
			'alignment',
			() => new Promise((resolve) => pending.push(resolve))
		);
		store.load(1, [emptyNote(7)]);
		store.load(2, [emptyNote(7)]);
		store.edit(1, 7, { field: 'alignment', value: 'bad' });
		store.edit(1, 7, { field: 'alignment', value: 'good' });
		pending[0]({ note: { ...emptyNote(7), alignment: 'bad', version: 1 }, conflict: false });
		await vi.waitFor(() => expect(pending).toHaveLength(2));
		expect(get(store)['1:7'].note.alignment).toBe('good');
		expect(get(store)['2:7'].note.alignment).toBe('unknown');
		pending[1]({ note: { ...emptyNote(7), alignment: 'good', version: 2 }, conflict: false });
		await vi.waitFor(() => expect(get(store)['1:7'].status).toBe('saved'));
		store.destroy();
	});
	it.each(['cloud', 'mine'] as const)(
		'preserves restored conflicts across remounts until choosing %s',
		async (choice) => {
			const memory = new Map<string, string>();
			const storage = {
				getItem: (key: string) => memory.get(key) ?? null,
				setItem: (key: string, value: string) => {
					memory.set(key, value);
				},
				removeItem: (key: string) => {
					memory.delete(key);
				}
			};
			let cloud = { ...emptyNote(7), memo: '另一分頁', version: 1 };
			const save = vi.fn(async (patch: NotePatch) => {
				if (patch.expectedVersion !== cloud.version) return { conflict: true, note: cloud };
				cloud = { ...applyNoteChange(cloud, patch.change), version: cloud.version + 1 };
				return { conflict: false, note: cloud };
			});
			let store = createDiscussionNotes('scope', save, storage);
			try {
				store.load(1, [emptyNote(7)]);
				store.edit(1, 7, { field: 'memo', value: '本機草稿' }, true);
				store.destroy();

				for (let remount = 0; remount < 3; remount++) {
					store = createDiscussionNotes('scope', save, storage);
					store.load(1, [cloud]);
					expect(get(store)['1:7'].status).toBe('conflict');
					expect(get(store)['1:7'].note.memo).toBe('本機草稿');
					store.retry(1, 7);
					if (remount === 1) store.edit(1, 7, { field: 'alignment', value: 'bad' });
					expect(save).not.toHaveBeenCalled();
					if (remount < 2) store.destroy();
				}

				store.resolve(1, 7, choice);
				await vi.waitFor(() => expect(get(store)['1:7'].status).toBe('saved'));
				expect(cloud).toMatchObject(
					choice === 'mine'
						? { memo: '本機草稿', alignment: 'bad', version: 3 }
						: { memo: '另一分頁', alignment: 'unknown', version: 1 }
				);
				expect(get(store)['1:7'].note).toEqual(cloud);
				expect(save).toHaveBeenCalledTimes(choice === 'mine' ? 2 : 0);
				store.destroy();
				store = createDiscussionNotes('scope', save, storage);
				store.load(1, [cloud]);
				expect(get(store)['1:7']).toEqual({ note: cloud, status: 'saved' });
			} finally {
				store.destroy();
			}
		}
	);
	it('restores an alignment draft and requires conflict resolution before saving', async () => {
		const storage = {
			getItem: () =>
				JSON.stringify({ version: 0, changes: [{ field: 'alignment', value: 'bad' }] }),
			setItem: () => {},
			removeItem: () => {}
		};
		const save = vi.fn(async (patch: NotePatch) => ({
			conflict: false,
			note: {
				...applyNoteChange({ ...emptyNote(7), memo: '另一分頁', version: 1 }, patch.change),
				version: 2
			}
		}));
		const store = createDiscussionNotes('alignment', save, storage);
		store.load(1, [{ ...emptyNote(7), memo: '另一分頁', version: 1 }]);
		expect(get(store)['1:7'].status).toBe('conflict');
		expect(get(store)['1:7'].note.alignment).toBe('bad');
		expect(save).not.toHaveBeenCalled();
		store.resolve(1, 7, 'mine');
		await vi.waitFor(() => expect(get(store)['1:7'].status).toBe('saved'));
		expect(get(store)['1:7'].note).toMatchObject({
			alignment: 'bad',
			memo: '另一分頁',
			version: 2
		});
		store.destroy();
	});
	it('saves only the latest debounced memo instead of every keystroke', async () => {
		vi.useFakeTimers();
		const save = vi.fn(async (patch: NotePatch) => ({
			conflict: false,
			note: { ...applyNoteChange(emptyNote(7), patch.change), version: 1 }
		}));
		const store = createDiscussionNotes('scope', save);
		store.load(1, [emptyNote(7)]);
		for (const value of ['第', '第一', '第一句']) store.edit(1, 7, { field: 'memo', value }, true);
		await vi.advanceTimersByTimeAsync(500);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save.mock.calls[0][0].change).toEqual({ field: 'memo', value: '第一句' });
		expect(get(store)['1:7'].status).toBe('saved');
		store.destroy();
	});
	it('queues edits per player and never replaces newer input with an old response', async () => {
		const pending: Array<(value: { note: DiscussionNote; conflict: boolean }) => void> = [];
		const patches: NotePatch[] = [];
		const store = createDiscussionNotes('user:game', (patch) => {
			patches.push(patch);
			return new Promise((resolve) => pending.push(resolve));
		});
		store.load(1, [emptyNote(7)]);
		store.edit(1, 7, { field: 'memo', value: '第一句' });
		store.edit(1, 7, { field: 'memo', value: '第二句' });
		expect(patches).toHaveLength(1);
		pending[0]({ note: { ...emptyNote(7), memo: '第一句', version: 1 }, conflict: false });
		await vi.waitFor(() => expect(patches).toHaveLength(2));
		expect(get(store)['1:7'].note.memo).toBe('第二句');
		expect(patches[1].expectedVersion).toBe(1);
		pending[1]({ note: { ...emptyNote(7), memo: '第二句', version: 2 }, conflict: false });
		await vi.waitFor(() => expect(get(store)['1:7'].status).toBe('saved'));
		store.destroy();
	});
	it('retains failed edits and retries without erasing the local claim', async () => {
		const save = vi
			.fn()
			.mockRejectedValueOnce(new Error('斷線'))
			.mockImplementation(async (patch: NotePatch) => ({
				conflict: false,
				note: { ...applyNoteChange(emptyNote(7), patch.change), version: 1 }
			}));
		const store = createDiscussionNotes('scope', save);
		store.load(1, []);
		store.edit(1, 7, { field: 'artifact', artifactId: 1, value: 'fake' });
		await vi.waitFor(() => expect(get(store)['1:7'].status).toBe('error'));
		expect(get(store)['1:7'].note.artifactClaims).toEqual({ 1: 'fake' });
		store.retry(1, 7);
		await vi.waitFor(() => expect(get(store)['1:7'].status).toBe('saved'));
	});
	it('requires a choice before overwriting conflicting cloud data', async () => {
		const cloud = { ...emptyNote(7), memo: '其他裝置', version: 4 };
		const save = vi.fn().mockResolvedValue({ conflict: true, note: cloud });
		const store = createDiscussionNotes('scope', save);
		store.load(1, []);
		store.edit(1, 7, { field: 'memo', value: '本機' });
		await vi.waitFor(() => expect(get(store)['1:7'].status).toBe('conflict'));
		expect(get(store)['1:7'].note.memo).toBe('本機');
		store.resolve(1, 7, 'cloud');
		expect(get(store)['1:7'].note.memo).toBe('其他裝置');
		expect(save).toHaveBeenCalledTimes(1);
	});
	it('debounces text while persisting a draft for refresh', async () => {
		vi.useFakeTimers();
		const memory = new Map<string, string>();
		const storage = {
			getItem: (k: string) => memory.get(k) ?? null,
			setItem: (k: string, v: string) => {
				memory.set(k, v);
			},
			removeItem: (k: string) => {
				memory.delete(k);
			}
		};
		const save = vi.fn();
		const store = createDiscussionNotes('scope', save, storage);
		store.load(1, []);
		store.edit(1, 7, { field: 'memo', value: '草稿' }, true);
		expect(save).not.toHaveBeenCalled();
		store.destroy();
		const restored = createDiscussionNotes('scope', save, storage);
		restored.load(1, [emptyNote(7)]);
		expect(get(restored)['1:7'].note.memo).toBe('草稿');
		expect(get(restored)['1:7'].status).toBe('error');
		restored.destroy();
	});
});
