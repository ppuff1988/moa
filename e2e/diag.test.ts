import { expect, test } from '@playwright/test';

test('診斷：API login vs form login', async ({ page, context }) => {
	// Step 1: Ensure user exists and is verified
	const verifyResp = await page.request.post('http://localhost:5173/api/test/verify-user', {
		data: { email: 'testuser1@test.com' }
	});
	console.log('Verify response:', verifyResp.status(), await verifyResp.text());

	// Step 2: Clear all cookies
	await context.clearCookies();

	// === Test A: API login via page.request ===
	console.log('\n=== Test A: API login via page.request ===');
	const loginResp = await page.request.post('http://localhost:5173/api/auth/login', {
		data: { email: 'testuser1@test.com', password: 'Test123456!' }
	});
	console.log('API login status:', loginResp.status());
	console.log('API login body:', await loginResp.text());

	// Check cookies after API login
	const cookiesA = await context.cookies();
	console.log(
		'Cookies after API login:',
		cookiesA.map((c) => `${c.name}(domain=${c.domain}, path=${c.path})`).join(', ') || 'NONE'
	);

	// Navigate to / and check
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	const htmlA = await page.content();
	console.log('Test A - Has 創建房間:', htmlA.includes('創建房間'));
	console.log('Test A - Has 登入/註冊:', htmlA.includes('登入/註冊'));

	// Check document.cookie from browser JS
	const docCookieA = await page.evaluate(() => document.cookie);
	console.log('Test A - document.cookie:', docCookieA || 'EMPTY');

	// === Test B: form login (native POST) ===
	console.log('\n=== Test B: form login (native POST) ===');
	await context.clearCookies();

	await page.goto('/auth/login');
	await page.waitForLoadState('networkidle');
	await page.fill('input#email', 'testuser1@test.com');
	await page.fill('input#password', 'Test123456!');
	await page.click('button[type="submit"]');
	await page.waitForURL('/', { timeout: 15000 });
	await page.waitForLoadState('networkidle');

	const cookiesB = await context.cookies();
	console.log(
		'Cookies after form login:',
		cookiesB.map((c) => `${c.name}(domain=${c.domain}, path=${c.path})`).join(', ') || 'NONE'
	);

	const htmlB = await page.content();
	console.log('Test B - Has 創建房間:', htmlB.includes('創建房間'));
	console.log('Test B - Has 登入/註冊:', htmlB.includes('登入/註冊'));

	const docCookieB = await page.evaluate(() => document.cookie);
	console.log('Test B - document.cookie:', docCookieB || 'EMPTY');

	// === Test C: fetch from browser JS after form login ===
	console.log('\n=== Test C: fetch from browser JS ===');
	const serverCheck = await page.evaluate(async () => {
		const resp = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'testuser1@test.com', password: 'Test123456!' })
		});
		return { status: resp.status, body: await resp.text() };
	});
	console.log('Test C - fetch login result:', serverCheck.status, serverCheck.body);

	// Now check cookies visible to browser
	const docCookieC = await page.evaluate(() => document.cookie);
	console.log('Test C - document.cookie after fetch login:', docCookieC || 'EMPTY');

	// Reload and check
	await page.reload();
	await page.waitForLoadState('networkidle');
	const htmlC = await page.content();
	console.log('Test C - After reload, Has 創建房間:', htmlC.includes('創建房間'));

	expect(htmlC.includes('創建房間')).toBe(true);
});
