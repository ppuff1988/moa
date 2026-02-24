import { defineConfig, devices } from '@playwright/test';

// 確保 Playwright 使用正確的瀏覽器路徑
process.env.PLAYWRIGHT_BROWSERS_PATH = '/workspace/.browsers';

/**
 * Playwright E2E 測試配置
 */
export default defineConfig({
	testDir: './e2e',

	fullyParallel: false,
	retries: 0, // 失敗時重試一次
	workers: process.env.CI ? 1 : undefined, // CI 上單工
	timeout: 180000, // 每個測試 180 秒（3分鐘）

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
		navigationTimeout: 60000, // 60秒
		actionTimeout: 30000, // 30秒
		serviceWorkers: 'block' // 封鎖 Service Worker 避免快取干擾 E2E 測試
	},

	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				// 使用系統的 Chromium 而不是下載的版本
				headless: true, // CI 上自動 headless
				executablePath: '/usr/bin/chromium-browser',
				launchArgs: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
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
