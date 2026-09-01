import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import type {} from '@vitest/browser/providers/playwright';

const systemChromePath = '/usr/bin/google-chrome';

export default defineConfig({
	test: {
		projects: [
			{
				plugins: [svelte()],
				resolve: {
					alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) }
				},
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: 'playwright',
						headless: true,
						instances: [
							{
								browser: 'chromium',
								...(existsSync(systemChromePath)
									? { launch: { executablePath: systemChromePath } }
									: {})
							}
						]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['vitest-browser-svelte']
				}
			},
			{
				plugins: [sveltekit()],
				test: {
					name: 'server',
					globals: true,
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['e2e/**/*', 'node_modules/**/*', 'src/**/*.svelte.{test,spec}.{js,ts}'],
					env: {
						// 從 .env 文件加載環境變數
						NODE_ENV: 'test',
						API_BASE_URL: process.env.API_BASE_URL,
						DATABASE_URL: process.env.DATABASE_URL,
						POSTGRES_HOST: process.env.POSTGRES_HOST,
						POSTGRES_USER: process.env.POSTGRES_USER,
						POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
						POSTGRES_DB: process.env.POSTGRES_DB,
						POSTGRES_PORT: process.env.POSTGRES_PORT,
						JWT_SECRET: process.env.JWT_SECRET
					},
					coverage: {
						provider: 'v8',
						reporter: ['text', 'json', 'html'],
						exclude: [
							'node_modules/',
							'e2e/',
							'**/*.test.ts',
							'**/*.spec.ts',
							'**/types/',
							'**/*.d.ts'
						]
					},
					testTimeout: 30000,
					hookTimeout: 30000,
					teardownTimeout: 10000,
					// API 測試需要實際的服務器運行
					setupFiles: ['./src/routes/api/__tests__/setup.ts']
				}
			}
		]
	}
});
