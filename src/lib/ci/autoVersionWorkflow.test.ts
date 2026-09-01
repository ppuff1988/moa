import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/auto-version.yml'), 'utf8');

describe('Auto Version Bump workflow', () => {
	it('routes protected main changes through a CI-checked pull request', () => {
		expect(workflow).not.toContain('git push origin main');
		expect(workflow).toContain('token: ${{ secrets.PAT }}');
		expect(workflow).toContain('pull-requests: write');
		expect(workflow).toContain('gh pr create');
		expect(workflow).toContain('gh pr merge --auto --squash');
	});
});
