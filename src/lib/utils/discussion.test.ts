import { describe, expect, it } from 'vitest';
import { applyNoteChange, emptyNote, parseNotePatch } from './discussion';

describe('private note input', () => {
	const base = { round: 1, subjectPlayerId: 7, expectedVersion: 0 };
	it('starts with an undecided private alignment', () => {
		expect(emptyNote(7)).toHaveProperty('alignment', 'unknown');
	});
	it.each(['good', 'unknown', 'bad'])('records %s without changing other notes', (value) => {
		const patch = parseNotePatch({ ...base, change: { field: 'alignment', value } });
		const note = { ...emptyNote(7), memo: '保留', artifactClaims: { 10: 'fake' as const } };
		const updated = applyNoteChange(note, patch.change);
		expect(updated).toEqual({ ...note, alignment: value });
		expect(applyNoteChange(updated, { field: 'claimedAttacked', value: true })).toMatchObject({
			alignment: value,
			memo: '保留',
			artifactClaims: {},
			claimedAttacked: true
		});
	});
	it('replaces a round attack statement when recording a new artifact claim', () => {
		const patch = parseNotePatch({
			...base,
			change: { field: 'artifact', artifactId: 10, value: 'fake' }
		});
		const note = {
			...emptyNote(7),
			subjectPlayerId: 7,
			version: 0,
			memo: '',
			claimedAttacked: true,
			artifactClaims: {}
		};
		expect(applyNoteChange(note, patch.change)).toMatchObject({
			artifactClaims: { 10: 'fake' },
			claimedAttacked: false
		});
	});
	it('clears only the selected claim', () => {
		const note = {
			...emptyNote(7),
			subjectPlayerId: 7,
			version: 0,
			memo: '保留',
			claimedAttacked: false,
			artifactClaims: { 10: 'fake' as const, 11: 'unable' as const }
		};
		expect(applyNoteChange(note, { field: 'artifact', artifactId: 10, value: null })).toMatchObject(
			{ memo: '保留', claimedAttacked: false, artifactClaims: { 11: 'unable' } }
		);
	});
	it('marks the whole round attacked and removes incompatible artifact claims', () => {
		const note = {
			...emptyNote(7),
			subjectPlayerId: 7,
			version: 2,
			memo: '保留備註',
			claimedAttacked: false,
			artifactClaims: { 10: 'fake' as const, 11: 'genuine' as const }
		};
		expect(applyNoteChange(note, { field: 'claimedAttacked', value: true })).toEqual({
			...note,
			artifactClaims: {},
			claimedAttacked: true
		});
	});
	it.each([
		{ ownerPlayerId: 3 },
		{ round: 4 },
		{ subjectPlayerId: -1 },
		{ expectedVersion: 1.5 },
		{ change: { field: 'memo', value: '字'.repeat(501) } },
		{ change: { field: 'artifact', artifactId: 1, value: 'truth' } },
		{ change: { field: 'artifact', artifactId: 1, value: ['fake'] } },
		{ change: { field: 'claimedAttacked', value: 'true' } },
		{ change: { field: 'alignment', value: 'evil' } },
		{ change: { field: 'alignment', value: null } },
		{ change: { field: 'alignment', value: ['good'] } },
		{ change: { field: 'alignment', value: 'good', ownerPlayerId: 3 } },
		{ change: { field: 'memo', value: 'a', hidden: 1 } }
	])('rejects invalid or extra data %j', (override) => {
		expect(() =>
			parseNotePatch({ ...base, change: { field: 'memo', value: '合法' }, ...override })
		).toThrow();
	});
});
