import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CI test coverage', () => {
	const root = process.cwd();
	const workflow = readFileSync(resolve(root, '.github/workflows/ci-test.yml'), 'utf8');
	const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
		engines: { npm: string };
		scripts: Record<string, string>;
	};

	it('CI 在 npm ci 前安裝 package engines 指定的 npm 版本', () => {
		const npmVersion = packageJson.engines.npm.replace(/^\^/, '');
		expect(workflow).toContain(`NPM_VERSION: '${npmVersion}'`);

		const jobSections = workflow.split(/^ {2}(?:lint|test-unit|test-api):$/m).slice(1);
		expect(jobSections).toHaveLength(3);

		for (const section of jobSections) {
			const installVersion = section.indexOf('run: npm install --global npm@${NPM_VERSION}');
			const installDependencies = section.indexOf('run: npm ci');

			expect(installVersion).toBeGreaterThan(-1);
			expect(installVersion).toBeLessThan(installDependencies);
		}
	});

	it('以不連資料庫的獨立設定執行 unit tests', () => {
		const unitConfigPath = resolve(root, 'vitest.unit.config.ts');

		expect(existsSync(unitConfigPath)).toBe(true);
		if (!existsSync(unitConfigPath)) return;

		const unitConfig = readFileSync(unitConfigPath, 'utf8');
		expect(unitConfig).toContain("include: ['src/lib/**/*.{test,spec}.{js,ts}']");
		expect(unitConfig).not.toContain('setupFiles');
		expect(workflow).toMatch(/^ {2}test-unit:$/m);
		expect(workflow).toContain('run: npm run test:unit -- --run');
	});

	it('PR CI 只執行短 smoke E2E，不執行 8 人完整 game-flow', () => {
		const smokeScript = packageJson.scripts['test:e2e:smoke'];
		expect(smokeScript).toBeTypeOf('string');
		if (!smokeScript) return;

		expect(smokeScript).toContain('PLAYWRIGHT_SMOKE=true');
		expect(smokeScript).toContain('playwright test smoke/');
		expect(smokeScript).not.toContain('game-flow');
		expect(workflow).toContain('run: npm run test:e2e:smoke');
		expect(workflow).toContain('playwright install --with-deps chromium');
		expect(workflow).not.toContain('playwright test game-flow');
	});

	it('smoke suite 以七個短案例覆蓋 health、auth、room 與 authorization', () => {
		const smokeDirectory = resolve(root, 'e2e/smoke');
		const smokeFiles = ['health.test.ts', 'auth.test.ts', 'room.test.ts', 'authorization.test.ts'];

		for (const file of [...smokeFiles, 'fixtures.ts']) {
			expect(existsSync(resolve(smokeDirectory, file)), `${file} 應存在`).toBe(true);
		}

		const testCount = smokeFiles.reduce((count, file) => {
			const path = resolve(smokeDirectory, file);
			if (!existsSync(path)) return count;
			return count + (readFileSync(path, 'utf8').match(/\btest\(/g)?.length ?? 0);
		}, 0);

		expect(testCount).toBe(7);
	});

	it('8 人 completion E2E 嚴格驗證三輪、鑑人與最終結果', () => {
		const completionPath = resolve(root, 'e2e/game-completion.test.ts');
		const completionScript = packageJson.scripts['test:e2e:game-completion'];

		expect(existsSync(completionPath)).toBe(true);
		expect(completionScript).toBe('playwright test game-completion.test.ts');
		if (!existsSync(completionPath)) return;

		const source = readFileSync(completionPath, 'utf8');
		expect(source).toContain('for (let round = 1; round <= 3; round++)');
		expect(source).toContain('/calculate-settlement');
		expect(source).toContain('/submit-identification');
		expect(source).toContain('/publish-identification');
		expect(source).toContain('/final-result');
		expect(source).toContain("page.locator('.final-result-panel')");
		expect(source).not.toContain('強制進入第');
	});

	it('Playwright 使用 runner 安裝的 Chromium，不綁定容器路徑', () => {
		const config = readFileSync(resolve(root, 'playwright.config.ts'), 'utf8');

		expect(config).not.toContain("PLAYWRIGHT_BROWSERS_PATH = '/workspace/.browsers'");
		expect(config).not.toContain("executablePath: '/usr/bin/chromium-browser'");
		expect(config).toMatch(
			/launchOptions:\s*\{[\s\S]*executablePath: process\.env\.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH \|\| undefined,[\s\S]*args: \['--no-sandbox'/
		);
		expect(config).not.toContain('launchArgs:');
		expect(config).toMatch(
			/video:\s*process\.env\.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH\s*\? 'off'\s*:\s*process\.env\.PLAYWRIGHT_SMOKE\s*\? 'retain-on-failure'\s*:\s*'on'/
		);
		expect(config).toContain('globalTimeout: process.env.PLAYWRIGHT_SMOKE ? 120000 : undefined');
		expect(config).toContain('timeout: process.env.PLAYWRIGHT_SMOKE ? 30000 : 180000');
		expect(config).toContain("trace: process.env.PLAYWRIGHT_SMOKE ? 'retain-on-failure' : 'on'");
		expect(config).toContain("screenshot: process.env.PLAYWRIGHT_SMOKE ? 'only-on-failure' : 'on'");
	});

	it('純投票 helper 不會在 unit tests 載入資料庫連線', () => {
		const source = readFileSync(resolve(root, 'src/lib/server/game-voting.ts'), 'utf8');

		expect(source).toContain("import type { db } from './db';");
		expect(source).not.toContain("import { db } from './db';");
	});
});
