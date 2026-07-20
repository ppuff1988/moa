import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('reset_games.sql', () => {
	const sql = readFileSync(resolve(process.cwd(), 'migrations/reset_games.sql'), 'utf8');

	it('要求 psql 在任一 SQL 錯誤時立即停止', () => {
		const onErrorStopPosition = sql.indexOf('\\set ON_ERROR_STOP on');
		const beginPosition = sql.indexOf('BEGIN;');

		expect(onErrorStopPosition).toBeGreaterThanOrEqual(0);
		expect(onErrorStopPosition).toBeLessThan(beginPosition);
	});

	it('以單一 transaction 包住所有刪除操作', () => {
		const beginPositions = [...sql.matchAll(/^BEGIN;$/gm)].map((match) => match.index);
		const commitPositions = [...sql.matchAll(/^COMMIT;$/gm)].map((match) => match.index);
		const deletePositions = [...sql.matchAll(/^DELETE FROM /gm)].map((match) => match.index);

		expect(beginPositions).toHaveLength(1);
		expect(commitPositions).toHaveLength(1);
		expect(deletePositions.length).toBeGreaterThan(0);
		expect(beginPositions[0]).toBeLessThan(deletePositions[0]);
		expect(commitPositions[0]).toBeGreaterThan(deletePositions.at(-1)!);
	});
});
