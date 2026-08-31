import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('ActionSequence round history details', () => {
	it('shows every player in turn order and the complete voting breakdown', () => {
		const source = readFileSync(new URL('./ActionSequence.svelte', import.meta.url), 'utf8');

		expect(source).toContain('round.playerOrder');
		expect(source).toContain('round.votingResult');
		expect(source).toContain('第一名');
		expect(source).toContain('第二名');
		expect(source).toContain('colorBreakdown');
		expect(source).toContain('VotingChip');
	});
});
