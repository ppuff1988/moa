import { expect, test, type Page } from '@playwright/test';
import { createSmokeUser, seedSmokeUsers } from './fixtures';

async function openHydratedLoginPage(page: Page): Promise<void> {
	await page.goto('/auth/login');
	await expect(page.locator('#email')).toBeVisible();
	await expect(page.locator('#password')).toBeVisible();
	await expect(page.getByRole('button', { name: '登入', exact: true })).toBeVisible();
	await expect(page.locator('form.auth-form')).toHaveAttribute('data-hydrated', 'true');
}

test('登入頁可操作且錯誤帳密不會建立 session', async ({ page }) => {
	await openHydratedLoginPage(page);

	await page.locator('#email').fill(`missing-${Date.now()}@test.com`);
	await page.locator('#password').fill('WrongPassword123!');
	const [loginResponse] = await Promise.all([
		page.waitForResponse(
			(response) => response.url().endsWith('/auth/login') && response.request().method() === 'POST'
		),
		page.getByRole('button', { name: '登入', exact: true }).click()
	]);

	expect(loginResponse.status()).toBe(200);
	await expect(page.locator('.error-message')).toContainText('Email 或密碼錯誤');
	await expect(page).toHaveURL(/\/auth\/login/);
	const profile = await page.request.get('/api/user/profile');
	expect(profile.status()).toBe(401);
});

test('登入 session 經重新整理仍有效，登出後立即失效', async ({ page, request }) => {
	const user = createSmokeUser('session');
	await seedSmokeUsers(request, [user]);

	await openHydratedLoginPage(page);
	await page.locator('#email').fill(user.email);
	await page.locator('#password').fill(user.password);
	const [loginResponse] = await Promise.all([
		page.waitForResponse(
			(response) => response.url().endsWith('/auth/login') && response.request().method() === 'POST'
		),
		page.getByRole('button', { name: '登入', exact: true }).click()
	]);

	expect(loginResponse.status()).toBe(200);
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('button', { name: '創建房間' })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('button', { name: '創建房間' })).toBeVisible();

	await page.locator('.user-button').click();
	const [logoutResponse] = await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST'
		),
		page.getByRole('button', { name: '登出', exact: true }).click()
	]);
	expect(logoutResponse.status()).toBe(200);
	await expect(page).toHaveURL(/\/auth\/login\?t=\d+/);

	const profile = await page.request.get('/api/user/profile');
	expect(profile.status()).toBe(401);
});
