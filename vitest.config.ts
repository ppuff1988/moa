import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['e2e/**/*', 'node_modules/**/*'],
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
			exclude: ['node_modules/', 'e2e/', '**/*.test.ts', '**/*.spec.ts', '**/types/', '**/*.d.ts']
		},
		testTimeout: 30000,
		hookTimeout: 30000,
		teardownTimeout: 10000,
		// API 測試需要實際的服務器運行
		setupFiles: ['./src/routes/api/__tests__/setup.ts']
	}
});
