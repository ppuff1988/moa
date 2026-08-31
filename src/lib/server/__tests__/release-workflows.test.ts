import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readWorkflow(name: string): string {
	const path = resolve(process.cwd(), '.github/workflows', name);
	return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('release workflow contracts', () => {
	it('does not execute notification actions from mutable branches', () => {
		const workflows = [
			'ci-test.yml',
			'ci-release.yml',
			'cd.yml',
			'auto-merge-dev.yml',
			'auto-merge-hotfix.yml',
			'sync-main-to-dev.yml'
		].map(readWorkflow);

		for (const workflow of workflows) {
			expect(workflow).not.toMatch(/appleboy\/telegram-action@(master|main|latest)/);
		}
	});

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
		expect(workflow).toContain('已有進行中的 Release／Hotfix PR');
		expect(workflow).toContain('- name: 再次確認沒有版本 PR');
		expect(workflow).toContain('git merge-base --is-ancestor origin/main HEAD');
		expect(workflow).toContain('head -n 1 || true');
		expect(workflow).toContain('group: version-preparation');
		expect(readWorkflow('auto-version.yml')).toContain('group: version-preparation');
		expect(autoMerge).toContain("startsWith(github.event.workflow_run.head_branch, 'release/v')");
		expect(autoMerge).toContain('compareVersions(headVersion, baseVersion) <= 0');
		expect(autoMerge).toContain("mergeMethod: 'MERGE'");
	});

	it('serializes hotfixes by repository state and advances the queue after main changes', () => {
		const workflow = readWorkflow('auto-version.yml');

		expect(workflow).toContain('types: [opened, reopened, synchronize, ready_for_review, closed]');
		expect(workflow).toContain('push:');
		expect(workflow).toContain('branches: [main]');
		expect(workflow).toContain('group: version-preparation');
		expect(workflow).toContain('github.paginate(github.rest.pulls.list');
		expect(workflow).toContain("pull.head.ref.startsWith('release/v')");
		expect(workflow).toContain('等待 Release PR');
		expect(workflow).toContain("startsWith(github.event.pull_request.head.ref, 'release/v')");
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
		const autoMerge = readWorkflow('auto-merge-dev.yml');

		expect(workflow).toContain('pull_request:');
		expect(workflow).toContain('types: [closed]');
		expect(workflow).toContain('github.event.pull_request.merged == true');
		expect(workflow).toContain("head: 'main'");
		expect(workflow).toContain("base: 'dev'");
		expect(workflow).not.toContain('enablePullRequestAutoMerge');
		expect(autoMerge).toContain("github.event.workflow_run.event == 'pull_request'");
		expect(autoMerge).toContain("sourceBranch === 'main' ? 'merge' : 'squash'");
		expect(autoMerge).toContain('等待 Codex Review');
	});

	it('reconciles every merged version and marks completion only after deployment', () => {
		const workflow = readWorkflow('ci-release.yml');

		expect(workflow).toContain('pull_request:');
		expect(workflow).toContain('types: [closed]');
		expect(workflow).toContain('schedule:');
		expect(workflow).toContain("pull.head.ref.startsWith('release/v')");
		expect(workflow).toContain("pull.head.ref.startsWith('hotfix/')");
		expect(workflow).toContain('name: 選取最舊的未發布版本');
		expect(workflow).toContain('github.paginate(github.rest.pulls.list');
		expect(workflow).toContain('pull.merge_commit_sha');
		expect(workflow).toContain('github.rest.repos.getReleaseByTag');
		expect(workflow).toContain('github.rest.repos.listReleases');
		expect(workflow).toContain('latestPublishedVersion');
		expect(workflow).toContain('compareVersions(version, latestPublishedVersion) <= 0');
		expect(workflow).toContain('async function resolveTagCommit(version)');
		expect(workflow).toContain('既有 tag v${version}');
		expect(workflow).toContain('ref: ${{ needs.select-release.outputs.release_sha }}');
		expect(workflow).toContain("workflow_id: 'ci-release.yml'");
		expect(workflow).toContain('uses: ./.github/workflows/cd.yml');
		expect(workflow).toContain("needs.deploy-production.result == 'success'");
		expect(workflow).toContain('tagCommit !== releaseSha');
		expect(workflow).toContain('generate_release_notes: true');
		expect(workflow).not.toContain(
			"github.rest.actions.createWorkflowDispatch({\n                owner: context.repo.owner,\n                repo: context.repo.repo,\n                workflow_id: 'cd.yml'"
		);
		expect(workflow).not.toContain('ref: main');
		expect(workflow).not.toContain("workflows: ['Auto Version Bump']");
	});

	it('deploys one immutable published version without duplicate event triggers', () => {
		const workflow = readWorkflow('cd.yml');
		const compose = readFileSync(resolve(process.cwd(), 'docker-compose.prod.yml'), 'utf8');
		const deploy = readFileSync(resolve(process.cwd(), 'deploy-prod.sh'), 'utf8');

		expect(workflow).toContain('workflow_call:');
		expect(workflow).toContain('workflow_dispatch:');
		expect(workflow).not.toContain('workflow_run:');
		expect(workflow).not.toMatch(/^ {2}release:$/m);
		expect(workflow).toContain('cancel-in-progress: false');
		expect(workflow).toContain("github.ref != 'refs/heads/main'");
		expect(workflow).toContain('git rev-list -n 1 "v${VERSION}"');
		expect(workflow).toContain('EXPECTED_SHA');
		expect(workflow).toContain('DEPLOY_SHA');
		expect(workflow).toContain('DEPLOY_SSH_KNOWN_HOSTS');
		expect(workflow).toContain('StrictHostKeyChecking=yes');
		expect(workflow).toContain('660b348d473bba81997445b534e7eaefaf4c4e16331866922326c338a7013dd9');
		expect(workflow).not.toContain('releases/latest/download');
		expect(workflow).not.toContain('appleboy/telegram-action@master');
		expect(workflow).not.toContain('git pull origin main');

		expect(compose).toContain('image: ${APP_IMAGE}');
		expect(compose).toContain('image: ${WORKER_IMAGE}');
		expect(deploy).toContain('docker run --rm');
		expect(deploy).toContain('"${APP_IMAGE}"');
		expect(deploy).toContain('PREVIOUS_APP_IMAGE');
		expect(deploy).toContain('回復舊版本');
		expect(deploy).not.toContain('stop app email-worker');
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
			expect(workflow).toContain('statuses: write');
			expect(workflow).toContain('github.rest.repos.createCommitStatus');
			expect(workflow).toContain("context: 'codex-review'");
			expect(workflow).toContain("await setCodexStatus(pr.head.sha, 'pending'");
			expect(workflow).toContain("await setCodexStatus(pr.head.sha, 'success'");
			expect(workflow).toContain("await setCodexStatus(pr.head.sha, 'failure'");
			expect(workflow).toContain('等待 Codex Review');
			expect(workflow).toContain('chatgpt-codex-connector[bot]');
			expect(workflow).toContain('codex-pull-request-review-summary');
			expect(workflow).toContain('pulls.listReviewComments');
			expect(workflow).not.toContain('findingReviews');
			expect(workflow).toContain('if (findings.length > 0)');
			expect(workflow).toContain('PR 在 Codex Review 期間有新 commit');
			expect(workflow).not.toContain("pr.mergeable_state === 'unstable'");
		}
	);
});
