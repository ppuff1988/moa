import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import fs from 'fs';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vitest/config';

// 檢查是否存在本地 SSL 憑證（用於 Safari OAuth 測試）
const httpsEnabled = fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem');

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson(),
		SvelteKitPWA({
			srcDir: './src',
			mode: 'production',
			strategies: 'generateSW',
			scope: '/',
			base: '/',
			selfDestroying: false,
			kit: {
				includeVersionFile: false
			},
			manifest: {
				name: 'MOA - 末日危途',
				short_name: 'MOA',
				description: '多人線上推理遊戲 - 在末日危途中找出潛伏的怪物',
				theme_color: '#000000',
				background_color: '#000000',
				display: 'standalone',
				orientation: 'portrait-primary',
				scope: '/',
				start_url: '/',
				categories: ['games', 'entertainment'],
				icons: [
					{
						src: '/pwa-icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/pwa-icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/pwa-icon-maskable-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'maskable'
					},
					{
						src: '/pwa-icon-maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
				globIgnores: ['**/app-icon-source.png', 'prerendered/**/*'],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				// 開發模式下不緩存 HTML，避免干擾登入狀態
				navigateFallbackDenylist: [/^\/(auth|api)\/.*/],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'gstatic-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /\/api\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							networkTimeoutSeconds: 10,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 5 // 5 minutes
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				]
			},
			injectManifest: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}']
			},
			devOptions: {
				enabled: false, // 開發模式下禁用 Service Worker，避免緩存干擾登入狀態
				suppressWarnings: true,
				type: 'module'
			}
		})
	],
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
