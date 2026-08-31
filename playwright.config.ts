import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 測試配置
 */
export default defineConfig({
	testDir: './e2e',

	fullyParallel: false,
	retries: 0,
	workers: process.env.CI ? 1 : undefined, // CI 上單工
	globalTimeout: process.env.PLAYWRIGHT_SMOKE ? 120000 : undefined,
	timeout: process.env.PLAYWRIGHT_SMOKE ? 30000 : 180000,

	// 報告配置
	reporter: process.env.CI
		? [
				['list'], // CI 上只輸出 console
				['json', { outputFile: 'test-results/test-results.json' }]
			]
		: [
				['html', { outputFolder: 'playwright-report', open: 'never' }], // 開發用 HTML
				['list']
			],

	use: {
		baseURL: 'http://localhost:5173',
		trace: process.env.PLAYWRIGHT_SMOKE ? 'retain-on-failure' : 'on',
		screenshot: process.env.PLAYWRIGHT_SMOKE ? 'only-on-failure' : 'on',
		video: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
			? 'off'
			: process.env.PLAYWRIGHT_SMOKE
				? 'retain-on-failure'
				: 'on',
		navigationTimeout: 60000, // 60秒
		actionTimeout: 30000, // 30秒
		serviceWorkers: 'block' // 封鎖 Service Worker 避免快取干擾 E2E 測試
	},

	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				headless: true, // CI 上自動 headless
				launchOptions: {
					executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
					args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
				}
			}
		}
	],

	webServer: process.env.CI
		? undefined // CI 環境中不自動啟動伺服器，由 CI workflow 手動管理
		: {
				command: 'npm run dev',
				url: 'http://localhost:5173',
				reuseExistingServer: true,
				timeout: 120000,
				stdout: 'pipe',
				stderr: 'pipe'
			}
});
