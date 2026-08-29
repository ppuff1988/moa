import { expect, test } from '@playwright/test';

const SITE_URL = 'https://moa.sportify.tw';
const TEST_BASE_URL = process.env.SEO_TEST_BASE_URL ?? 'http://localhost:5173';

const testUrl = (path: string) => new URL(path, TEST_BASE_URL).toString();

test.describe('SEO metadata', () => {
	test('首頁輸出唯一且一致的網站名稱 metadata', async ({ page }) => {
		await page.goto(testUrl('/'));

		await expect(page).toHaveTitle('古董局中局非官方APP｜免費線上桌遊輔助工具');
		await expect(page.locator('meta[name="description"]')).toHaveCount(1);
		await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
		await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
		await expect(page.locator('meta[property="og:site_name"]')).toHaveCount(1);
		await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
			'content',
			'古董局中局'
		);
		await expect(page.locator('meta[name="application-name"]')).toHaveAttribute(
			'content',
			'古董局中局'
		);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE_URL}/`);
		await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
			'content',
			`${SITE_URL}/`
		);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
		await expect(page.locator('.footer-copyright')).toContainText(
			new Date().getFullYear().toString()
		);

		const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
		expect(schemas).toHaveLength(1);
		const website = JSON.parse(schemas[0]);
		expect(website).toMatchObject({
			'@type': 'WebSite',
			name: '古董局中局',
			alternateName: ['古董局中局非官方APP', 'moa.sportify.tw'],
			url: `${SITE_URL}/`
		});
	});

	test('公開內容頁使用自己的 canonical 與標題', async ({ page }) => {
		await page.goto(testUrl('/terms'));

		await expect(page).toHaveTitle('使用者條款｜古董局中局');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`${SITE_URL}/terms`
		);
		await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
			'content',
			`${SITE_URL}/terms`
		);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
	});

	for (const route of [
		{ path: '/auth/login', title: '登入｜古董局中局' },
		{ path: '/auth/register', title: '註冊｜古董局中局' },
		{ path: '/auth/forgot-password', title: '忘記密碼｜古董局中局' },
		{ path: '/auth/reset-password', title: '重設密碼｜古董局中局' }
	]) {
		test(`${route.path} 使用獨立標題且禁止索引`, async ({ page }) => {
			await page.goto(testUrl(route.path));

			await expect(page).toHaveTitle(route.title);
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
				'href',
				`${SITE_URL}${route.path}`
			);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
				'content',
				'noindex, nofollow'
			);
		});
	}

	test('sitemap 只列出可索引的公開頁面', async ({ request }) => {
		const response = await request.get(testUrl('/sitemap.xml'));
		expect(response.ok()).toBe(true);

		const sitemap = await response.text();
		expect(sitemap).toContain(`<loc>${SITE_URL}/</loc>`);
		expect(sitemap).toContain(`<loc>${SITE_URL}/terms</loc>`);
		expect(sitemap).not.toContain('/auth/');
	});
});
