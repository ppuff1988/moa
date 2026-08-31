import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		globals: true,
		environment: 'node',
		include: ['src/lib/**/*.{test,spec}.{js,ts}'],
		exclude: ['node_modules/**/*'],
		env: {
			NODE_ENV: 'test',
			JWT_SECRET: process.env.JWT_SECRET
		},
		testTimeout: 30000,
		hookTimeout: 30000,
		teardownTimeout: 10000
	}
});
