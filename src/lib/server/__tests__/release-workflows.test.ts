import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';

function readWorkflow(name: string): string {
	const path = resolve(process.cwd(), '.github/workflows', name);
	return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function readGithubScript(name: string, stepId: string): string {
	const lines = readWorkflow(name).split('\n');
	const idIndex = lines.findIndex((line) => line.trim() === `id: ${stepId}`);
	const scriptIndex = lines.findIndex(
		(line, index) => index > idIndex && line.trim() === 'script: |'
	);
	if (idIndex < 0 || scriptIndex < 0) return '';

	const script: string[] = [];
	for (const line of lines.slice(scriptIndex + 1)) {
		if (line && !line.startsWith('            ')) break;
		script.push(line.startsWith('            ') ? line.slice(12) : '');
	}
	return script.join('\n');
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

	it('persists manual release requests before dispatching the version coordinator', () => {
		const workflow = readWorkflow('prepare-release.yml');
		const autoVersion = readWorkflow('auto-version.yml');
		const autoMerge = readWorkflow('auto-merge-release.yml');

		expect(workflow).toContain('name: Prepare Release');
		expect(workflow).toContain('workflow_dispatch:');
		expect(workflow).toContain('moa-release-request');
		expect(workflow).toContain("labels: ['release-request']");
		expect(workflow).toContain("workflow_id: 'auto-version.yml'");
		expect(workflow).toContain("ref: 'main'");
		expect(workflow).toContain("context.ref !== 'refs/heads/main'");
		expect(workflow).toContain('context.actor !== context.repo.owner');
		expect(workflow).not.toContain('group: version-preparation');
		expect(workflow).not.toContain('enablePullRequestAutoMerge');
		expect(workflow).not.toContain('git push origin main');
		expect(workflow).not.toContain('git push origin dev');

		expect(autoVersion).toContain('group: version-preparation');
		expect(autoVersion).toContain('issues:');
		expect(autoVersion).toContain("labels: 'release-request'");
		expect(autoVersion).toContain('moa-release-request');
		expect(autoVersion).toContain("branch: 'dev'");
		expect(autoVersion).toContain('release/v${NEW_VERSION}');
		expect(autoVersion).toContain("base: 'main'");
		expect(autoVersion).toContain('git merge-base --is-ancestor origin/main HEAD');
		expect(autoVersion).toContain('head -n 1 || true');
		expect(autoVersion).toContain('npm version "$BUMP_TYPE" --no-git-tag-version --ignore-scripts');
		expect(autoVersion).toContain("state: 'closed'");
		expect(autoVersion).toContain('recentClosedPulls');
		expect(autoVersion).toContain('github.rest.actions.getWorkflowRun');
		expect(autoVersion).toContain("run.path === '.github/workflows/prepare-release.yml'");
		expect(autoVersion).toContain("issue.author_association !== 'OWNER'");
		expect(autoVersion).toContain("pull.author_association === 'OWNER'");
		expect(autoVersion).toContain('await authenticateReleaseRequest(issue)');
		expect(autoVersion.match(/authenticateReleaseRequest\(issue\)/g)).toHaveLength(5);
		expect(autoVersion).toContain('expectedCompletion');
		expect(autoVersion).toContain('expectedPreparation');
		expect(autoVersion).toContain('release_sha=');
		expect(autoVersion).toContain('RELEASE_SHA: ${{ steps.push_release.outputs.release_sha }}');
		expect(autoVersion).toContain('pr.head.sha !== process.env.RELEASE_SHA');
		expect(autoVersion).toContain('github.rest.issues.createComment');
		expect(autoVersion).toContain('Release request #${requestNumber} 已由 PR');
		expect(autoVersion).toContain('git diff --quiet "origin/${RELEASE_BRANCH}" -- .');
		expect(autoVersion).toContain("pr.author_association !== 'OWNER'");
		expect(autoMerge).toContain("startsWith(github.event.workflow_run.head_branch, 'release/v')");
		expect(autoMerge).toContain("pr.author_association !== 'OWNER'");
		expect(autoMerge).toContain('github.rest.actions.getWorkflowRun');
		expect(autoMerge).toContain("run.path === '.github/workflows/prepare-release.yml'");
		expect(autoMerge).toContain('expectedPreparation');
		expect(autoMerge).toContain('pr.head.sha');
		expect(autoMerge).toContain('compareVersions(headVersion, baseVersion) <= 0');
		expect(autoMerge).toContain("mergeMethod: 'MERGE'");
	});

	it('serializes hotfixes by repository state and advances the queue after main changes', () => {
		const workflow = readWorkflow('auto-version.yml');

		expect(workflow).toContain('pull_request_target:');
		expect(workflow).not.toMatch(/^ {2}pull_request:$/m);
		expect(workflow).toContain("github.event.pull_request.author_association == 'OWNER'");
		expect(workflow).toContain('github.event.pull_request.user.login == github.repository_owner');
		expect(workflow).toContain('types: [opened, reopened, synchronize, ready_for_review, closed]');
		expect(workflow).toContain('push:');
		expect(workflow).toContain('branches: [main, dev]');
		expect(workflow).toContain('group: version-preparation');
		expect(workflow).toContain('github.paginate(github.rest.pulls.list');
		expect(workflow).toContain("pull.head.ref.startsWith('release/v')");
		expect(workflow.match(/const trustedHotfixPull = \(pull\) =>/g)).toHaveLength(2);
		expect(workflow.match(/filter\(\(pull\) => trustedHotfixPull\(pull\)\)/g)).toHaveLength(2);
		expect(workflow).toContain('等待 Release PR');
		expect(workflow).toContain("startsWith(github.event.pull_request.head.ref, 'release/v')");
		expect(workflow).toContain('const selectedPr = hotfixPulls[0];');
		expect(workflow.match(/!pull\.draft/g)).toHaveLength(2);
		expect(workflow).not.toContain('if (selectedPr.draft)');
		expect(workflow.indexOf('const selectedPr = hotfixPulls[0];')).toBeLessThan(
			workflow.indexOf('等待 Release PR')
		);
		expect(workflow).toContain("state: 'open'");
		expect(workflow).toContain('github.rest.git.getRef');
		expect(workflow).toContain('releaseRef.object.sha !== pull.head.sha');
		expect(workflow).toContain('github.rest.git.deleteRef');
		expect(workflow).toContain('搶占 Release PR');
		expect(workflow).toContain('preemptedPullNumbers');
		expect(workflow).toContain('activeReleasePulls');
		expect(workflow).toContain('完成先前中斷的 Release PR');
		expect(workflow).toContain("core.setOutput('kind', 'release')");
		expect(workflow).toContain("core.setOutput('kind', 'hotfix')");
		expect(workflow).toContain('目前工作已不是版本佇列首項');
		expect(workflow.indexOf('uses: actions/setup-node@v6')).toBeLessThan(
			workflow.indexOf('uses: actions/checkout@v6')
		);
		expect(
			workflow.match(
				/if: steps\.queue\.outputs\.has_work == 'true' && steps\.queue\.outputs\.kind == 'release'/g
			)
		).toHaveLength(4);
		expect(workflow).toContain('working-directory: ${{ runner.temp }}');
		expect(workflow).toContain('--ignore-scripts --registry=https://registry.npmjs.org');
		expect(workflow).not.toContain('cache: npm');
		expect(workflow).not.toContain('git merge --no-edit origin/main');
		expect(workflow).toContain('github.rest.repos.merge');
		expect(workflow).toContain("core.setOutput('main_sha', mainBranch.commit.sha)");
		expect(workflow).toContain('github.rest.repos.compareCommitsWithBasehead');
		expect(workflow).toContain('mainBranch.commit.sha !== selectedMainSha');
		expect(workflow).not.toContain('reservedVersions');
		expect(workflow).not.toContain(
			'npm version "$EXPECTED_VERSION" --no-git-tag-version --ignore-scripts'
		);
		expect(workflow).not.toContain('git push origin "HEAD:${HEAD_BRANCH}"');
		expect(workflow).toContain('github.rest.git.createBlob');
		expect(workflow).toContain('github.rest.git.createTree');
		expect(workflow).toContain('github.rest.git.createCommit');
		expect(workflow).toContain('github.rest.git.updateRef');
		expect(workflow).toContain('force: false');
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
		expect(workflow).toContain('const pendingReleases = [];');
		expect(workflow).toContain('pendingReleases.push({ pull, version });');
		expect(workflow).toContain('pendingReleases.findLastIndex');
		expect(workflow).toContain('github.rest.repos.compareCommitsWithBasehead');
		expect(workflow).toContain("!['ahead', 'identical'].includes(comparison.status)");
		expect(workflow).toContain('const selectedRelease = pendingReleases[selectedIndex];');
		expect(workflow).toContain('async function resolveTagCommit(version)');
		expect(workflow).toContain('既有 tag v${version}');
		expect(workflow).toContain('ref: ${{ needs.select-release.outputs.release_sha }}');
		expect(
			workflow.match(/ref: \$\{\{ needs\.select-release\.outputs\.release_sha \}\}/g)
		).toHaveLength(2);
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

	it('lets a later descendant hotfix supersede a failed release', async () => {
		const selector = readGithubScript('ci-release.yml', 'release');
		const pullsList = vi.fn();
		const releasesList = vi.fn();
		const mergedPulls = [
			{
				number: 120,
				merged_at: '2026-08-30T10:00:00Z',
				merge_commit_sha: 'release-sha',
				head: { ref: 'release/v1.2.0', repo: { full_name: 'ppuff1988/moa' } }
			},
			{
				number: 121,
				merged_at: '2026-08-30T11:00:00Z',
				merge_commit_sha: 'hotfix-sha',
				head: { ref: 'hotfix/production', repo: { full_name: 'ppuff1988/moa' } }
			}
		];
		const versionBySha = new Map([
			['release-sha', '1.2.0'],
			['hotfix-sha', '1.2.1']
		]);
		const github = {
			paginate: vi.fn(async (endpoint: unknown) => (endpoint === pullsList ? mergedPulls : [])),
			rest: {
				pulls: { list: pullsList },
				repos: {
					listReleases: releasesList,
					getContent: vi.fn(async ({ ref }: { ref: string }) => ({
						data: {
							content: Buffer.from(JSON.stringify({ version: versionBySha.get(ref) })).toString(
								'base64'
							)
						}
					})),
					compareCommitsWithBasehead: vi.fn(async () => ({ data: { status: 'ahead' } }))
				},
				git: {
					getRef: vi.fn(async () => {
						throw Object.assign(new Error('not found'), { status: 404 });
					}),
					getTag: vi.fn()
				}
			}
		};
		const core = {
			info: vi.fn(),
			notice: vi.fn(),
			warning: vi.fn(),
			setOutput: vi.fn()
		};
		const context = {
			eventName: 'schedule',
			ref: 'refs/heads/main',
			repo: { owner: 'ppuff1988', repo: 'moa' },
			payload: { repository: { full_name: 'ppuff1988/moa' } }
		};
		const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

		await new AsyncFunction('github', 'context', 'core', 'Buffer', selector)(
			github,
			context,
			core,
			Buffer
		);

		expect(github.rest.repos.compareCommitsWithBasehead).toHaveBeenCalledWith(
			expect.objectContaining({ basehead: 'release-sha...hotfix-sha' })
		);
		expect(core.setOutput).toHaveBeenCalledWith('has_release', 'true');
		expect(core.setOutput).toHaveBeenCalledWith('release_sha', 'hotfix-sha');
		expect(core.setOutput).toHaveBeenCalledWith('version', '1.2.1');

		github.rest.repos.compareCommitsWithBasehead.mockResolvedValueOnce({
			data: { status: 'diverged' }
		});
		await expect(
			new AsyncFunction('github', 'context', 'core', 'Buffer', selector)(
				github,
				context,
				core,
				Buffer
			)
		).rejects.toThrow('無法安全 supersede');
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
		expect(workflow.indexOf('while [ "$attempt" -le "$max_attempts" ]')).toBeLessThan(
			workflow.indexOf('scp "${SCP_OPTS[@]}" "$ENV_FILE"')
		);

		expect(compose).toContain('image: ${APP_IMAGE}');
		expect(compose).toContain('image: ${WORKER_IMAGE}');
		expect(deploy).toContain('docker run --rm');
		expect(deploy).toContain('"${APP_IMAGE}"');
		expect(deploy).toContain('PREVIOUS_APP_IMAGE');
		expect(deploy).toContain("docker inspect --format '{{.Image}}' moa_app_prod");
		expect(deploy).toContain('docker image tag "$PREVIOUS_APP_IMAGE_ID"');
		expect(deploy).toContain('docker image tag "$PREVIOUS_WORKER_IMAGE_ID"');
		expect(deploy).not.toContain("docker inspect --format '{{.Config.Image}}'");
		expect(deploy).toContain('persist_image_selection');
		expect(deploy).toContain('trap finalize_deployment EXIT');
		expect(deploy).toContain('SWITCHOVER_STARTED=false');
		expect(deploy).toContain('ROLLBACK_ATTEMPTED=false');
		expect(deploy).toContain('if [ "$SWITCHOVER_STARTED" = "true" ]');
		expect(deploy).toContain(
			'if ! $DOCKER_COMPOSE -f docker-compose.prod.yml up -d app email-worker'
		);
		expect(deploy).toContain('DEPLOYMENT_SUCCEEDED=true');
		expect(deploy).toContain('已持久化 rollback image 選擇');
		expect(deploy).toContain('回復舊版本');
		expect(deploy).not.toContain('stop app email-worker');
	});

	it('actively restores both previous images when service replacement fails', () => {
		const fixture = mkdtempSync(resolve(tmpdir(), 'moa-deploy-rollback-'));
		const composeLog = resolve(fixture, 'compose.log');

		try {
			writeFileSync(resolve(fixture, 'package.json'), '{"version":"1.1.14"}\n');
			writeFileSync(
				resolve(fixture, '.env'),
				[
					'APP_IMAGE=registry.example/moa:v2',
					'WORKER_IMAGE=registry.example/moa:worker-v2',
					'DATABASE_URL=postgresql://example'
				].join('\n') + '\n'
			);
			writeFileSync(resolve(fixture, 'docker-compose.prod.yml'), 'services: {}\n');
			writeFileSync(resolve(fixture, 'deploy-prod.sh'), readFileSync('deploy-prod.sh', 'utf8'));
			writeFileSync(
				resolve(fixture, 'docker'),
				`#!/bin/sh
case "$1" in
  inspect)
    case "$*" in
      *moa_app_prod*) echo 'sha256:old-app' ;;
      *moa_email_worker_prod*) echo 'sha256:old-worker' ;;
    esac
    ;;
  ps) echo 'moa_postgres_prod healthy' ;;
  image|run) exit 0 ;;
esac
exit 0
`
			);
			writeFileSync(
				resolve(fixture, 'docker-compose'),
				`#!/bin/sh
printf '%s|%s|%s\\n' "\${APP_IMAGE:-}" "\${WORKER_IMAGE:-}" "$*" >> "$MOA_COMPOSE_LOG"
case "$*" in
  *pull*) exit 0 ;;
  *"up -d app email-worker"*)
    if [ "\${APP_IMAGE:-}" = 'moa-rollback:app' ] && [ "\${WORKER_IMAGE:-}" = 'moa-rollback:worker' ]; then
      exit 0
    fi
    exit 42
    ;;
esac
exit 0
`
			);
			for (const executable of ['deploy-prod.sh', 'docker', 'docker-compose']) {
				chmodSync(resolve(fixture, executable), 0o755);
			}
			// Keep the fixture command directory explicit so the host Docker daemon is never touched.
			const result = spawnSync('bash', ['deploy-prod.sh'], {
				cwd: fixture,
				env: {
					...process.env,
					PATH: `${fixture}:${process.env.PATH}`,
					MOA_COMPOSE_LOG: composeLog
				},
				encoding: 'utf8'
			});

			expect(result.status).toBe(1);
			const composeCalls = readFileSync(composeLog, 'utf8');
			expect(composeCalls).toContain(
				'registry.example/moa:v2|registry.example/moa:worker-v2|-f docker-compose.prod.yml up -d app email-worker'
			);
			expect(composeCalls).toContain(
				'moa-rollback:app|moa-rollback:worker|-f docker-compose.prod.yml up -d app email-worker'
			);
			const persistedEnvironment = readFileSync(resolve(fixture, '.env'), 'utf8');
			expect(persistedEnvironment).toContain('APP_IMAGE=moa-rollback:app');
			expect(persistedEnvironment).toContain('WORKER_IMAGE=moa-rollback:worker');
		} finally {
			rmSync(fixture, { recursive: true, force: true });
		}
	});

	it('waits for the hotfix version bump and uses native merge auto-merge', () => {
		const workflow = readWorkflow('auto-merge-hotfix.yml');

		expect(workflow).toContain(
			'group: auto-merge-hotfix-${{ github.event.workflow_run.pull_requests[0].number || github.event.workflow_run.id }}'
		);
		expect(workflow.match(/await getHotfixQueue\(\)/g)).toHaveLength(2);
		expect(workflow).toContain('cancel-in-progress: true');
		expect(workflow).toContain('headVersion === baseVersion');
		expect(workflow).toContain('const queueHead = hotfixPulls[0];');
		expect(workflow).toContain('queueHead.number !== pr.number');
		expect(workflow.match(/pull\.author_association === 'OWNER'/g)).toHaveLength(1);
		expect(workflow.match(/pull\.user\?\.login === context\.repo\.owner/g)).toHaveLength(1);
		expect(workflow).toContain("pr.author_association !== 'OWNER'");
		expect(workflow).toContain('pr.user?.login !== context.repo.owner');
		expect(workflow).toContain('enablePullRequestAutoMerge');
		expect(workflow).toContain("mergeMethod: 'MERGE'");
		expect(workflow).not.toContain("merge_method: 'squash'");
		expect(workflow).not.toContain('github.rest.pulls.merge');
	});

	it('only auto-merges generated same-repository release requests', () => {
		const workflow = readWorkflow('auto-merge-release.yml');

		expect(workflow).toContain('pr.head.repo?.full_name !== context.payload.repository.full_name');
		expect(workflow).toContain('validateReleaseRequest(pr)');
		expect(workflow).toContain('release-request');
		expect(workflow).toContain('moa-release-request');
		expect(workflow).toContain('Release PR #${pr.number} 已建立');
		expect(workflow).toContain("comment.author_association === 'OWNER'");
	});

	it('uses the automation PAT when bot changes must trigger another workflow', () => {
		const prepareRelease = readWorkflow('prepare-release.yml');
		const autoVersion = readWorkflow('auto-version.yml');
		const autoMergeDev = readWorkflow('auto-merge-dev.yml');
		const syncMainToDev = readWorkflow('sync-main-to-dev.yml');

		expect(prepareRelease).toContain('github-token: ${{ secrets.PAT }}');
		expect(prepareRelease).toContain('github.rest.actions.createWorkflowDispatch');
		expect(autoVersion).toContain('token: ${{ secrets.PAT }}');
		expect(autoMergeDev).toContain('github-token: ${{ secrets.PAT }}');
		expect(syncMainToDev).toContain('github-token: ${{ secrets.PAT }}');
	});

	it.each(['auto-merge-dev.yml', 'auto-merge-release.yml', 'auto-merge-hotfix.yml'])(
		'binds CI and a finding-free Codex review to the current head in %s',
		(workflowName) => {
			const workflow = readWorkflow(workflowName);

			expect(workflow).toContain('pr.head.sha !== context.payload.workflow_run.head_sha');
			expect(workflow).toContain('pr.base.sha !== associatedPR.base.sha');
			expect(workflow).toContain('pr.base.ref !== associatedPR.base.ref');
			expect(workflow).toContain('const reviewedBaseSha = pr.base.sha');
			expect(workflow).toContain('const reviewedBaseRef = pr.base.ref');
			expect(workflow).toContain('pr.base.sha !== reviewedBaseSha');
			expect(workflow).toContain('pr.base.ref !== reviewedBaseRef');
			expect(workflow).toContain("pr.state !== 'open' || pr.draft");
			expect(workflow).toContain(
				'${{ github.event.workflow_run.pull_requests[0].number || github.event.workflow_run.id }}'
			);
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

	it('passes the reviewed head SHA to the direct dev merge API', () => {
		const workflow = readWorkflow('auto-merge-dev.yml');

		expect(workflow).toContain('sha: reviewedSha');
	});
});
