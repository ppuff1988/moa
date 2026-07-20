import { expect, type APIRequestContext, type Page } from '@playwright/test';

export interface SmokeUser {
	email: string;
	password: string;
	nickname: string;
}

const runId =
	`${process.env.GITHUB_RUN_ID ?? Date.now()}-${process.env.GITHUB_RUN_ATTEMPT ?? process.pid}`
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-');

export function createSmokeUser(label: string): SmokeUser {
	return {
		email: `smoke-${label}-${runId}@test.com`,
		password: 'SmokeTest123!',
		nickname: `smoke-${label}-${runId}`.slice(0, 50)
	};
}

export async function seedSmokeUsers(
	request: APIRequestContext,
	users: SmokeUser[]
): Promise<void> {
	const response = await request.post('/api/test/create-users', {
		data: {
			users: users.map((user) => ({
				email: user.email,
				password: user.password,
				nickname: user.nickname
			}))
		}
	});

	expect(response.status(), await response.text()).toBe(200);
}

export async function loginThroughApi(page: Page, user: SmokeUser): Promise<void> {
	const response = await page.request.post('/api/auth/login', {
		data: { email: user.email, password: user.password }
	});

	expect(response.status(), await response.text()).toBe(200);
	await page.goto('/');
	await expect(page.getByRole('button', { name: '創建房間' })).toBeVisible();
}

export async function createRoomThroughUi(page: Page, password = 'smoke-room'): Promise<string> {
	await expect(async () => {
		await page.getByRole('button', { name: '創建房間' }).click();
		await expect(page.locator('#roomPassword')).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 5000 });
	await page.locator('#roomPassword').fill(password);

	const [response] = await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().endsWith('/api/room/create') && response.request().method() === 'POST'
		),
		page.locator('.room-form').getByRole('button', { name: '創建房間' }).click()
	]);

	expect(response.status()).toBe(201);
	await expect(page).toHaveURL(/\/room\/[^/]+\/lobby$/);
	await expect(page.getByTestId('lobby-container')).toBeVisible();
	return new URL(page.url()).pathname.split('/')[2];
}

export async function joinRoomThroughUi(
	page: Page,
	roomName: string,
	password = 'smoke-room'
): Promise<void> {
	await expect(async () => {
		await page.getByRole('button', { name: '加入房間' }).click();
		await expect(page.locator('#roomName')).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 5000 });
	await page.locator('#roomName').fill(roomName);
	await page.locator('#roomPassword').fill(password);

	const [response] = await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().endsWith('/api/room/join') && response.request().method() === 'POST'
		),
		page.locator('.room-form').getByRole('button', { name: '加入房間' }).click()
	]);

	expect(response.status()).toBe(200);
	await expect(page).toHaveURL(new RegExp(`/room/${roomName}/lobby$`));
	await expect(page.getByTestId('lobby-container')).toBeVisible();
}

export async function leaveRoomThroughUi(page: Page, roomName: string): Promise<void> {
	await page.getByRole('button', { name: '離開房間' }).click();

	const [response] = await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().endsWith(`/api/room/${roomName}/leave`) &&
				response.request().method() === 'POST'
		),
		page.getByRole('button', { name: '確認離開', exact: true }).click()
	]);

	expect(response.status()).toBe(200);
	await expect(page).toHaveURL('/');
}

export async function cleanupRoom(page: Page, roomName: string | undefined): Promise<void> {
	if (!roomName) return;
	await page.request.post(`/api/room/${roomName}/leave`).catch(() => undefined);
}
