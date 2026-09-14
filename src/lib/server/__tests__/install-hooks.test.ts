import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const installHooksScript = fileURLToPath(new URL('../../../../install-hooks.sh', import.meta.url));
let fixtureDirectory: string | undefined;

afterEach(() => {
	if (fixtureDirectory) {
		rmSync(fixtureDirectory, { recursive: true, force: true });
		fixtureDirectory = undefined;
	}
});

describe('Git hooks installer', () => {
	it('removes a stale installed pre-push hook', () => {
		fixtureDirectory = mkdtempSync(join(tmpdir(), 'moa-hooks-'));
		const gitHooksDirectory = join(fixtureDirectory, '.git', 'hooks');
		const sourceHooksDirectory = join(fixtureDirectory, '.githooks');
		mkdirSync(gitHooksDirectory, { recursive: true });
		mkdirSync(sourceHooksDirectory, { recursive: true });
		writeFileSync(join(gitHooksDirectory, 'pre-push'), '#!/usr/bin/env sh\nexit 1\n');
		writeFileSync(join(sourceHooksDirectory, 'pre-commit'), '#!/usr/bin/env sh\nexit 0\n');

		execFileSync('bash', [installHooksScript], { cwd: fixtureDirectory });

		expect(existsSync(join(gitHooksDirectory, 'pre-push'))).toBe(false);
		expect(existsSync(join(gitHooksDirectory, 'pre-commit'))).toBe(true);
	});
});
