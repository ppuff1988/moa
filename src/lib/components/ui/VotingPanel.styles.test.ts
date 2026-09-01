import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('VotingPanel dark surface contrast', () => {
	it('uses warm high-contrast text tokens instead of the light-card foreground', () => {
		const source = readFileSync(new URL('./VotingPanel.svelte', import.meta.url), 'utf8');
		const onlinePanelStyles = source.slice(source.indexOf('\t.online-voting-panel {'));

		expect(onlinePanelStyles).toContain('--voting-text-strong: #f4eee3;');
		expect(onlinePanelStyles).toContain('--voting-text-muted: #c5b9aa;');
		expect(onlinePanelStyles).toContain('--voting-text-gold: #d6bc76;');
		expect(onlinePanelStyles).not.toContain('color: hsl(var(--card-foreground));');
	});
});
