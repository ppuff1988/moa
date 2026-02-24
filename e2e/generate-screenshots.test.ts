import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, '../static');

test.describe('PWA Screenshots Generator', () => {
	test('generate desktop screenshot (1920x1080)', async ({ page }) => {
		await page.goto('/');
		// 等待頁面完全加載
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// 設置桌面視窗大小
		await page.setViewportSize({ width: 1920, height: 1080 });

		// 生成截圖
		await page.screenshot({
			path: path.join(staticDir, 'screenshot-desktop.png'),
			fullPage: false
		});

		console.log('✓ 桌面截圖已保存');
	});

	test('generate mobile screenshot (390x844)', async ({ page }) => {
		await page.goto('/');
		// 等待頁面完全加載
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// 設置手機視窗大小
		await page.setViewportSize({ width: 390, height: 844 });

		// 生成截圖
		await page.screenshot({
			path: path.join(staticDir, 'screenshot-mobile.png'),
			fullPage: false
		});

		console.log('✓ 手機截圖已保存');
	});
});
