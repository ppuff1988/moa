import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readWorkflow(name: string): string {
	const path = resolve(process.cwd(), '.github/workflows', name);
	return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('release workflow contracts', () => {
	it('prepares a versioned release branch from dev before opening the main PR', () => {
		const workflow = readWorkflow('prepare-release.yml');
		const autoMerge = readWorkflow('auto-merge-release.yml');

		expect(workflow).toContain('name: Prepare Release');
		expect(workflow).toContain('workflow_dispatch:');
		expect(workflow).toContain('ref: dev');
		expect(workflow).toContain('release/v${NEW_VERSION}');
		expect(workflow).toContain("base: 'main'");
		expect(workflow).not.toContain('enablePullRequestAutoMerge');
		expect(workflow).not.toContain('git push origin main');
		expect(workflow).not.toContain('git push origin dev');
		expect(autoMerge).toContain("startsWith(github.event.workflow_run.head_branch, 'release/v')");
		expect(autoMerge).toContain("mergeMethod: 'MERGE'");
	});

	it('serializes hotfixes by repository state and advances the queue after main changes', () => {
		const workflow = readWorkflow('auto-version.yml');

		expect(workflow).toContain('types: [opened, reopened, synchronize, ready_for_review, closed]');
		expect(workflow).toContain('push:');
		expect(workflow).toContain('branches: [main]');
		expect(workflow).toContain('group: hotfix-version-all');
		expect(workflow).toContain('github.paginate(github.rest.pulls.list');
		expect(workflow).toContain('const selectedPr = hotfixPulls[0];');
		expect(workflow).toContain('git merge --no-edit origin/main');
		expect(workflow).not.toContain('reservedVersions');
		expect(workflow).toContain('npm version "$EXPECTED_VERSION" --no-git-tag-version');
		expect(workflow).toContain('git push origin "HEAD:${HEAD_BRANCH}"');
		expect(workflow).not.toContain('git push origin main');
		expect(workflow).not.toContain('git push origin dev');
	});

	it('merges main back into dev without squashing its ancestry', () => {
		const workflow = readWorkflow('sync-main-to-dev.yml');

		expect(workflow).toContain('pull_request:');
		expect(workflow).toContain('types: [closed]');
		expect(workflow).toContain('github.event.pull_request.merged == true');
		expect(workflow).toContain("head: 'main'");
		expect(workflow).toContain("base: 'dev'");
		expect(workflow).toContain("mergeMethod: 'MERGE'");
		expect(workflow).not.toContain("mergeMethod: 'SQUASH'");
	});

	it('releases only merged versioned release and hotfix PRs', () => {
		const workflow = readWorkflow('ci-release.yml');

		expect(workflow).toContain('pull_request:');
		expect(workflow).toContain('types: [closed]');
		expect(workflow).toContain("startsWith(github.event.pull_request.head.ref, 'release/v')");
		expect(workflow).toContain("startsWith(github.event.pull_request.head.ref, 'hotfix/')");
		expect(workflow).toContain('github.event.pull_request.merged == true');
		expect(workflow).toContain('github.event.pull_request.merge_commit_sha');
		expect(workflow).toContain('ref: ${{ env.RELEASE_SHA }}');
		expect(workflow).toContain('moa:${{ env.RELEASE_SHA }}');
		expect(workflow).not.toContain('ref: main');
		expect(workflow).not.toContain("workflows: ['Auto Version Bump']");
	});

	it('waits for the hotfix version bump and uses native merge auto-merge', () => {
		const workflow = readWorkflow('auto-merge-hotfix.yml');

		expect(workflow).toContain(
			'group: auto-merge-hotfix-${{ github.event.workflow_run.head_branch }}'
		);
		expect(workflow).toContain('cancel-in-progress: true');
		expect(workflow).toContain('headVersion === baseVersion');
		expect(workflow).toContain('const queueHead = hotfixPulls[0];');
		expect(workflow).toContain('queueHead.number !== pr.number');
		expect(workflow).toContain('enablePullRequestAutoMerge');
		expect(workflow).toContain("mergeMethod: 'MERGE'");
		expect(workflow).not.toContain("merge_method: 'squash'");
		expect(workflow).not.toContain('github.rest.pulls.merge');
	});

	it('uses the automation PAT when bot changes must trigger another workflow', () => {
		const prepareRelease = readWorkflow('prepare-release.yml');
		const autoVersion = readWorkflow('auto-version.yml');
		const syncMainToDev = readWorkflow('sync-main-to-dev.yml');

		expect(prepareRelease).toContain('token: ${{ secrets.PAT }}');
		expect(prepareRelease).toContain('github-token: ${{ secrets.PAT }}');
		expect(autoVersion).toContain('token: ${{ secrets.PAT }}');
		expect(syncMainToDev).toContain('github-token: ${{ secrets.PAT }}');
	});

	it.each(['auto-merge-dev.yml', 'auto-merge-release.yml', 'auto-merge-hotfix.yml'])(
		'binds CI and a finding-free Codex review to the current head in %s',
		(workflowName) => {
			const workflow = readWorkflow(workflowName);

			expect(workflow).toContain('pr.head.sha !== context.payload.workflow_run.head_sha');
			expect(workflow).toContain('等待 Codex Review');
			expect(workflow).toContain('chatgpt-codex-connector[bot]');
			expect(workflow).toContain('codex-pull-request-review-summary');
			expect(workflow).toContain('pulls.listReviewComments');
			expect(workflow).toContain('findingReviews');
			expect(workflow).toContain('PR 在 Codex Review 期間有新 commit');
			expect(workflow).not.toContain("pr.mergeable_state === 'unstable'");
		}
	);
});
