import { expect, test } from '@playwright/test';

const SITE_URL = 'https://moa.sportify.tw';
const HOME_TITLE = '古董局中局桌遊輔助工具｜MOA 非官方 App・免下載';
const HOME_DESCRIPTION =
	'MOA 是《古董局中局》的免費非官方網頁桌遊輔助工具，支援 6–8 人使用手機、平板或電腦加入房間，協助鑑定、投票與遊戲流程。免下載，建議搭配實體桌遊使用。';
const TEST_BASE_URL = process.env.SEO_TEST_BASE_URL ?? 'http://localhost:5173';

const testUrl = (path: string) => new URL(path, TEST_BASE_URL).toString();

test.describe('SEO metadata', () => {
	test('首頁輸出唯一且一致的網站名稱 metadata', async ({ page }) => {
		await page.goto(testUrl('/'));

		await expect(page).toHaveTitle(HOME_TITLE);
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
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			'content',
			'index, follow, max-image-preview:large'
		);
		await expect(page.locator('.footer-copyright')).toContainText(
			new Date().getFullYear().toString()
		);

		const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
		expect(schemas).toHaveLength(2);
		const website = schemas
			.map((schema) => JSON.parse(schema))
			.find((schema) => schema['@type'] === 'WebSite');
		expect(website).toMatchObject({
			'@type': 'WebSite',
			name: '古董局中局',
			alternateName: ['MOA', '古董局中局非官方APP', 'moa.sportify.tw'],
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
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			'content',
			'index, follow, max-image-preview:large'
		);
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

	test('帶追蹤參數的首頁仍使用乾淨的 canonical，分享摘要與可見介紹一致', async ({
		page,
		request
	}) => {
		await page.goto(testUrl('/?utm_source=sharing'));
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE_URL}/`);
		for (const selector of [
			'meta[name="description"]',
			'meta[property="og:description"]',
			'meta[name="twitter:description"]'
		]) {
			await expect(page.locator(selector)).toHaveAttribute('content', HOME_DESCRIPTION);
		}
		await expect(page.locator('.hero-description')).toHaveText(HOME_DESCRIPTION);
		const image = await page.locator('meta[property="og:image"]').getAttribute('content');
		expect(image).toBe(`${SITE_URL}/social-home.jpg`);
		const response = await request.get(testUrl('/social-home.jpg'));
		expect(response.ok()).toBe(true);
		expect(response.headers()['content-type']).toContain('image/jpeg');
	});

	test('離開首頁後不殘留首頁問答結構化資料', async ({ page }) => {
		await page.goto(testUrl('/'));
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2);
		await page.getByRole('link', { name: '立即開始遊戲', exact: true }).click();
		await expect(page).toHaveURL(testUrl('/auth/login'));
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
	});

	test('找不到的頁面回傳 404 並禁止索引', async ({ page }) => {
		const response = await page.goto(testUrl('/seo-nonexistent-page'));
		expect(response?.status()).toBe(404);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex, nofollow'
		);
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
	});
});

test.describe('AEO 可讀內容', () => {
	test.use({ javaScriptEnabled: false });

	test('不執行 JavaScript 也能讀到介紹、開局步驟及與畫面一致的 FAQ 結構化資料', async ({
		page
	}) => {
		await page.goto(testUrl('/'));
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.locator('.hero-description')).toHaveText(HOME_DESCRIPTION);
		await expect(page.locator('#how-to-play li')).toHaveCount(3);
		const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
		const graph = schemas.map((schema) => JSON.parse(schema)).find((schema) => schema['@graph'])?.[
			'@graph'
		];
		expect(graph).toBeDefined();
		const webPage = graph.find((node: { '@type': string }) => node['@type'] === 'WebPage');
		expect(webPage).toMatchObject({
			'@id': `${SITE_URL}/#webpage`,
			inLanguage: 'zh-TW',
			isPartOf: { '@id': `${SITE_URL}/#website` }
		});
		const app = graph.find((node: { '@type': string }) => node['@type'] === 'WebApplication');
		expect(app).toMatchObject({
			name: 'MOA 古董局中局非官方桌遊輔助工具',
			isAccessibleForFree: true,
			image: `${SITE_URL}/pwa-icon-512.png`
		});
		expect(app).not.toHaveProperty('aggregateRating');
		const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
		expect(faq.mainEntity).toHaveLength(8);
		for (const question of faq.mainEntity) {
			const item = page
				.locator('.faq-item')
				.filter({ has: page.getByRole('heading', { name: question.name, exact: true }) });
			await expect(item).toBeVisible();
			await expect(item.locator('p')).toHaveText(question.acceptedAnswer.text);
			await expect(item).toHaveAttribute('id', new URL(question.url).hash.slice(1));
		}
	});
});
