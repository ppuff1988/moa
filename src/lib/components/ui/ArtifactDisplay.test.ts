import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import ArtifactDisplay from './ArtifactDisplay.svelte';

describe('ArtifactDisplay voting controls', () => {
	it('renders chip controls inside each existing beast card', () => {
		const { body } = render(ArtifactDisplay, {
			props: {
				beastHeads: [
					{ id: 1, animal: '龍', votes: 0 },
					{ id: 2, animal: '蛇', votes: 0 }
				],
				identifiedArtifacts: [1],
				failedIdentifications: [2],
				currentRound: 2,
				votingControls: {
					allocations: { 1: 2, 2: 0 },
					remaining: 2,
					playerColorCode: '#A855F7',
					locked: false,
					onAdjust: () => {}
				}
			} as never
		});

		expect(body.match(/class="beast-card(?: |")/g)).toHaveLength(2);
		expect(body.match(/class="chip-stepper/g)).toHaveLength(2);
		expect(body).toContain('aria-label="增加投給龍首的籌碼"');
		expect(body).toContain('aria-label="減少投給龍首的籌碼"');
		expect(body).toContain('/voting-chip.png');
		expect(body).toContain('--chip-color: #A855F7');
		expect(body).toContain('2 枚');
	});
});
