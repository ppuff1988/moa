import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('leaderboard ranking rules styles', () => {
	it('preserves ordered list numbering after Tailwind Preflight', () => {
		const source = readFileSync(new URL('./LeaderboardView.svelte', import.meta.url), 'utf8');
		const listStyles = source.slice(
			source.indexOf('\n\t.ranking-rules ol {'),
			source.indexOf('\n\t.ranking-rules li {')
		);

		expect(listStyles).toContain('list-style: decimal;');
	});
});
