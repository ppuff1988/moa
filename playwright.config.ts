import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 測試配置
 */
export default defineConfig({
	testDir: './e2e',

	fullyParallel: false,
	retries: 0,
	workers: process.env.CI ? 1 : undefined, // CI 上單工
	timeout: 120000, // 每個測試 120 秒

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
		trace: 'on',
		screenshot: 'on',
		video: 'on',
		navigationTimeout: 30000,
		actionTimeout: 15000
	},

	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				headless: true // CI 上自動 headless
			}
		}
	],

	webServer: process.env.CI
		? undefined // CI 環境中不自動啟動伺服器，由 CI workflow 手動管理
		: {
				command: 'npm run dev',
				url: 'http://localhost:5173',
				reuseExistingServer: false,
				timeout: 120000,
				stdout: 'pipe',
				stderr: 'pipe'
			}
});
