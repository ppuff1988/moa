import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it.each([
	{ skip: false, migrationExit: 0, deployExit: 0 },
	{ skip: false, migrationExit: 1, deployExit: 1 },
	{ skip: true, migrationExit: 0, deployExit: 1 }
])('deployment requires migrations: %j', ({ skip, migrationExit, deployExit }) => {
	const fixture = mkdtempSync(resolve(tmpdir(), 'moa-migration-deploy-'));
	const log = resolve(fixture, 'calls.log');
	try {
		writeFileSync(log, '');
		writeFileSync(resolve(fixture, 'deploy-prod.sh'), readFileSync('deploy-prod.sh'));
		writeFileSync(resolve(fixture, 'package.json'), '{"version":"1.0.0"}');
		writeFileSync(
			resolve(fixture, '.env'),
			`APP_IMAGE=example/moa:v1\nWORKER_IMAGE=example/moa:worker-v1\nDATABASE_URL=postgresql://example\nSKIP_MIGRATION=${skip}\n`
		);
		const commands = {
			docker: `case "$1" in
  inspect) exit 1 ;;
  ps) echo 'moa_postgres_prod healthy' ;;
  run) echo 'migration' >> "$MOA_TEST_DEPLOY_LOG"; exit "$MOA_TEST_MIGRATION_EXIT" ;;
esac`,
			'docker-compose': `case "$*" in
  *"up -d app email-worker"*) echo 'start' >> "$MOA_TEST_DEPLOY_LOG" ;;
esac`,
			sleep: 'exit 0',
			curl: `echo '{"status":"ok"}'`
		};
		for (const [name, source] of Object.entries(commands)) {
			writeFileSync(resolve(fixture, name), `#!/bin/sh\n${source}\n`, { mode: 0o755 });
		}
		const result = spawnSync('bash', ['deploy-prod.sh'], {
			cwd: fixture,
			env: {
				...process.env,
				PATH: `${fixture}:${process.env.PATH}`,
				MOA_TEST_DEPLOY_LOG: log,
				MOA_TEST_MIGRATION_EXIT: String(migrationExit)
			},
			encoding: 'utf8',
			timeout: 10000
		});
		expect(result.status).toBe(deployExit);
		expect(readFileSync(log, 'utf8')).toBe(
			skip ? '' : migrationExit ? 'migration\n' : 'migration\nstart\n'
		);
	} finally {
		rmSync(fixture, { recursive: true, force: true });
	}
});
