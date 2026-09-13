import { expect, test } from '@playwright/test';

test('訪客可從首頁開啟總榜並切換角色榜', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: '玩家排行榜', exact: true }).first().click();
	await expect(page).toHaveURL('/leaderboard');
	await expect(page.getByRole('heading', { name: '玩家勝場榜', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: '總勝場榜', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await page.getByRole('link', { name: '許愿', exact: true }).click();
	await expect(page).toHaveURL(/\/leaderboard\/roles\/\d+$/);
	await expect(page.getByRole('heading', { name: '許愿勝場榜', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: '許愿', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await page.getByRole('link', { name: '返回首頁', exact: true }).click();
	await expect(page).toHaveURL('/');
});

test('手機角色榜可直接開啟、重新整理且沒有橫向溢出', async ({ page, request }) => {
	const response = await request.get('/api/roles');
	const { roles } = await response.json();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(`/leaderboard/roles/${roles[0].id}`);
	await expect(
		page.getByRole('heading', { name: `${roles[0].name}勝場榜`, exact: true })
	).toBeVisible();
	await page.reload();
	await expect(page.locator('nav[aria-label="排行榜分類"] a')).toHaveCount(roles.length + 1);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('公開排行榜 API 僅回傳排行所需資訊並拒絕無效參數', async ({ request }) => {
	const response = await request.get('/api/leaderboard');
	expect(response.status()).toBe(200);
	const body = await response.json();
	expect(body).toHaveProperty('entries');
	expect(body).toHaveProperty('roles');
	for (const row of body.entries) {
		expect(Object.keys(row).sort()).toEqual(
			['games', 'nickname', 'rank', 'winRate', 'wins'].sort()
		);
	}
	for (const winner of body.leaders) {
		expect(Object.keys(winner)).toEqual(['nickname']);
	}
	for (const query of ['?page=-1', '?page=1.5', '?role=abc', '?role=1%20OR%201=1']) {
		expect((await request.get(`/api/leaderboard${query}`)).status()).toBe(400);
	}
	expect((await request.get('/api/leaderboard?role=2147483647')).status()).toBe(404);
});
