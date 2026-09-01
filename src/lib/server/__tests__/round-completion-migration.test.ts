import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('round completion data migration', () => {
	it('normalizes historical round phases and completion timestamps', () => {
		const sql = readFileSync(
			resolve(process.cwd(), 'migrations/0013_normalize_round_completion.sql'),
			'utf8'
		);

		expect(sql).toContain('UPDATE game_rounds AS previous_round');
		expect(sql).toContain('FROM game_rounds AS next_round');
		expect(sql).toContain('next_round.round = previous_round.round + 1');
		expect(sql).toContain("previous_round.phase = 'result'");
		expect(sql).toContain("phase = 'completed'");
		expect(sql).toContain('completed_at = next_round.started_at');
		expect(sql).toContain('completed_round.completed_at IS NULL');
		expect(sql).toContain("phase <> 'completed'");
	});
});
