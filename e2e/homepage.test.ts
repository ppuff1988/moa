import { expect, test } from '@playwright/test';

for (const viewport of [
	{ width: 1440, height: 900 },
	{ width: 390, height: 844 }
]) {
	test(`首頁與登入頁可往返 (${viewport.width}px)`, async ({ page }) => {
		await page.setViewportSize(viewport);
		await page.goto('/');
		await page.getByRole('link', { name: '立即開始遊戲', exact: true }).first().click();
		await expect(page).toHaveURL('/auth/login');
		await page.getByRole('link', { name: '返回首頁', exact: true }).click();
		await expect(page).toHaveURL('/');
		await expect(page.getByRole('heading', { name: '古董局中局', exact: true })).toBeVisible();
	});
}

test('直接開啟登入頁也能以鍵盤返回首頁', async ({ page }) => {
	await page.goto('/auth/login');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: '返回首頁', exact: true })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL('/');
});

test('手機導覽可開關、以 Escape 關閉並跳至開局說明', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	const menu = page.getByRole('button', { name: '選單', exact: true });
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
	await menu.click();
	await expect(menu).toHaveAttribute('aria-expanded', 'true');
	await page.keyboard.press('Escape');
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
	await expect(menu).toBeFocused();
	await menu.click();
	await page.getByRole('link', { name: '如何開始', exact: true }).click();
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
	await expect(page).toHaveURL('/#how-to-play');
	await expect(page.getByRole('heading', { name: '三步，入局。', exact: true })).toBeInViewport();
});
