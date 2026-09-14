import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const installHooksScript = fileURLToPath(new URL('../../../../install-hooks.sh', import.meta.url));
const legacyPrePushHook = `#!/usr/bin/env sh

# Pre-push hook for running tests
# 執行測試

node scripts/pre-push-checks.js
`;
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
		writeFileSync(join(gitHooksDirectory, 'pre-push'), legacyPrePushHook);
		writeFileSync(join(sourceHooksDirectory, 'pre-commit'), '#!/usr/bin/env sh\nexit 0\n');

		execFileSync('bash', [installHooksScript], { cwd: fixtureDirectory });

		expect(existsSync(join(gitHooksDirectory, 'pre-push'))).toBe(false);
		expect(existsSync(join(gitHooksDirectory, 'pre-commit'))).toBe(true);
	});

	it('removes a stale legacy hook with CRLF line endings', () => {
		fixtureDirectory = mkdtempSync(join(tmpdir(), 'moa-hooks-'));
		const gitHooksDirectory = join(fixtureDirectory, '.git', 'hooks');
		const sourceHooksDirectory = join(fixtureDirectory, '.githooks');
		mkdirSync(gitHooksDirectory, { recursive: true });
		mkdirSync(sourceHooksDirectory, { recursive: true });
		writeFileSync(join(gitHooksDirectory, 'pre-push'), legacyPrePushHook.replace(/\n/g, '\r\n'));
		writeFileSync(join(sourceHooksDirectory, 'pre-commit'), '#!/usr/bin/env sh\nexit 0\n');

		execFileSync('bash', [installHooksScript], { cwd: fixtureDirectory });

		expect(existsSync(join(gitHooksDirectory, 'pre-push'))).toBe(false);
	});

	it('preserves an unrelated installed pre-push hook', () => {
		fixtureDirectory = mkdtempSync(join(tmpdir(), 'moa-hooks-'));
		const gitHooksDirectory = join(fixtureDirectory, '.git', 'hooks');
		const sourceHooksDirectory = join(fixtureDirectory, '.githooks');
		const customPrePushHook = '#!/usr/bin/env sh\necho custom hook\n';
		mkdirSync(gitHooksDirectory, { recursive: true });
		mkdirSync(sourceHooksDirectory, { recursive: true });
		writeFileSync(join(gitHooksDirectory, 'pre-push'), customPrePushHook);
		writeFileSync(join(sourceHooksDirectory, 'pre-commit'), '#!/usr/bin/env sh\nexit 0\n');

		execFileSync('bash', [installHooksScript], { cwd: fixtureDirectory });

		expect(readFileSync(join(gitHooksDirectory, 'pre-push'), 'utf8')).toBe(customPrePushHook);
	});
});
