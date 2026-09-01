import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/auto-version.yml'), 'utf8');
const releaseWorkflow = readFileSync(
	resolve(process.cwd(), '.github/workflows/ci-release.yml'),
	'utf8'
);
const syncWorkflow = readFileSync(
	resolve(process.cwd(), '.github/workflows/sync-main-to-dev.yml'),
	'utf8'
);

describe('Auto Version Bump workflow', () => {
	it('routes protected main changes through a CI-checked pull request', () => {
		expect(workflow).not.toContain('git push origin main');
		expect(workflow).toContain('token: ${{ secrets.PAT }}');
		expect(workflow).toContain('pull-requests: write');
		expect(workflow).toContain('gh pr create');
		expect(workflow).toContain('gh pr merge --auto --squash');
	});

	it('recomputes the latest main state on one retry-safe version pull request', () => {
		expect(workflow).toContain("'auto-version-main'");
		expect(workflow).toContain('cancel-in-progress: true');
		expect(workflow).toContain('VERSION_BRANCH="chore/version-bump"');
		expect(workflow).toContain('git push --force-with-lease');
		expect(workflow).toContain('gh pr list');
		expect(workflow).toContain('--json autoMergeRequest');
		expect(workflow).not.toContain('等待版本升級 PR 合併');
	});

	it('starts release consumers only for a merged version branch', () => {
		for (const consumer of [releaseWorkflow, syncWorkflow]) {
			expect(consumer).toContain("branches: ['chore/version-bump']");
			expect(consumer).not.toContain("branches: ['chore/version-bump*']");
		}
		expect(syncWorkflow).not.toContain("head_branch == 'main'");
	});

	it('preserves the merged version run in a separate concurrency group', () => {
		expect(workflow).toContain("format('auto-version-release-{0}'");
		expect(workflow).toContain("github.event.pull_request.head.ref == 'chore/version-bump'");
		expect(workflow).toContain(
			'github.event.pull_request.head.repo.full_name == github.repository'
		);
	});

	it('fails the trigger workflow when a version pull request closes unmerged', () => {
		expect(workflow).toContain('guard-version-pr-merge:');
		expect(workflow).toContain('github.event.pull_request.merged != true');
		expect(workflow).toContain(
			'github.event.pull_request.head.repo.full_name != github.repository'
		);
		expect(workflow).toContain('exit 1');
	});

	it('requires strict up-to-date checks before enabling version auto-merge', () => {
		expect(workflow).toContain('strict_required_status_checks_policy');
		expect(workflow).toContain('STRICT_CHECKS_REQUIRED');
		expect(workflow).toContain('gh pr merge --disable-auto');
	});
});
