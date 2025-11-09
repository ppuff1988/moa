import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import fs from 'fs';

// 檢查是否存在本地 SSL 憑證（用於 Safari OAuth 測試）
const httpsEnabled = fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem');

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		// 如果存在本地 SSL 憑證，啟用 HTTPS（用於 Safari OAuth 測試）
		...(httpsEnabled && {
			https: {
				key: fs.readFileSync('./localhost-key.pem'),
				cert: fs.readFileSync('./localhost.pem')
			}
		})
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
