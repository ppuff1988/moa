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
const hotfixWorkflow = readFileSync(
	resolve(process.cwd(), '.github/workflows/auto-merge-hotfix.yml'),
	'utf8'
);
const cdWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/cd.yml'), 'utf8');

describe('Auto Version Bump workflow', () => {
	it('routes protected main changes through a CI-checked pull request', () => {
		expect(workflow).not.toContain('git push origin main');
		expect(workflow).toContain('token: ${{ secrets.PAT }}');
		expect(workflow).toContain('pull-requests: write');
		expect(workflow).toContain('gh pr create');
		expect(workflow).toContain('gh pr merge --auto --squash');
	});

	it('recomputes the latest main state on one retry-safe version pull request', () => {
		expect(workflow).toContain('push:');
		expect(workflow).toContain('branches: [main]');
		expect(workflow).toContain('group: auto-version-main');
		expect(workflow).toContain('cancel-in-progress: true');
		expect(workflow).toContain('ref: main');
		expect(workflow).toContain('--ignore-scripts');
		expect(workflow).toContain('VERSION_BRANCH="chore/version-bump"');
		expect(workflow).toContain('git push --force-with-lease');
		expect(workflow).toContain('gh pr list');
		expect(workflow).toContain('--json url,isCrossRepository,headRepository,headRepositoryOwner');
		expect(workflow).toContain('.isCrossRepository == false');
		expect(workflow).toContain('env.GITHUB_REPOSITORY');
		expect(workflow).toContain('--json autoMergeRequest');
		expect(workflow).not.toContain('等待版本升級 PR 合併');
	});

	it('starts release consumers only for the merged automation-owned pull request', () => {
		for (const consumer of [releaseWorkflow, syncWorkflow]) {
			expect(consumer).toContain('pull_request:');
			expect(consumer).toContain('types: [closed]');
			expect(consumer).toContain('branches: [main]');
			expect(consumer).toContain('github.event.pull_request.merged == true');
			expect(consumer).toContain("github.event.pull_request.head.ref == 'chore/version-bump'");
			expect(consumer).toContain(
				'github.event.pull_request.head.repo.full_name == github.repository'
			);
			expect(consumer).not.toContain('workflow_run:');
		}
	});

	it('runs version analysis only from the trusted main push context', () => {
		expect(workflow).not.toContain('pull_request_target:');
		expect(workflow).not.toContain('github.event.pull_request');
		expect(workflow).not.toContain('guard-version-pr-merge:');
	});

	it('uses the PAT for same-repository hotfix merges so their main push triggers workflows', () => {
		expect(hotfixWorkflow).toContain('github-token: ${{ secrets.PAT }}');
		expect(hotfixWorkflow).toContain(
			'pr.head.repo.full_name !== context.payload.repository.full_name'
		);
	});

	it('dispatches CD only after CI Release creates a new version', () => {
		expect(cdWorkflow).toContain('workflow_dispatch:');
		expect(cdWorkflow).not.toContain('workflow_run:');
		expect(releaseWorkflow).toContain("workflow_id: 'cd.yml'");
		expect(releaseWorkflow).toContain('createWorkflowDispatch');
	});

	it('requires strict up-to-date checks before enabling version auto-merge', () => {
		expect(workflow).toContain('strict_required_status_checks_policy');
		expect(workflow).toContain('STRICT_CHECKS_REQUIRED');
		expect(workflow).toContain('gh pr merge --disable-auto');
	});

	it('describes the pre-merge version notification as pending', () => {
		expect(workflow).toContain('版本升級 PR 已建立或更新');
		expect(workflow).toContain('等待 required checks 與自動合併');
		expect(workflow).not.toContain('🚀 *版本自動升級*');
	});
});
