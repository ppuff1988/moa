import { expect, test } from '@playwright/test';
import {
	cleanupRoom,
	createRoomThroughUi,
	createSmokeUser,
	joinRoomThroughUi,
	leaveRoomThroughUi,
	loginThroughApi,
	seedSmokeUsers
} from './fixtures';

test('登入玩家可建立房間並成為房主', async ({ page, request }) => {
	const host = createSmokeUser('create-host');
	await seedSmokeUsers(request, [host]);
	await loginThroughApi(page, host);

	let roomName: string | undefined;
	try {
		roomName = await createRoomThroughUi(page);
		await expect(page.locator('.room-number')).toHaveText(roomName);
		await expect(page.getByTestId('players-section')).toContainText(host.nickname);
		await expect(page.locator('.host-badge')).toBeVisible();
	} finally {
		await cleanupRoom(page, roomName);
	}
});

test('第二位玩家加入後雙方名單即時同步', async ({ browser, request }) => {
	const host = createSmokeUser('join-host');
	const guest = createSmokeUser('join-guest');
	await seedSmokeUsers(request, [host, guest]);

	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();
	let roomName: string | undefined;

	try {
		await loginThroughApi(hostPage, host);
		await loginThroughApi(guestPage, guest);
		roomName = await createRoomThroughUi(hostPage);
		await joinRoomThroughUi(guestPage, roomName);

		await expect(hostPage.getByTestId('players-section')).toContainText(guest.nickname);
		await expect(guestPage.getByTestId('players-section')).toContainText(host.nickname);
		await expect(guestPage.getByTestId('players-section')).toContainText(guest.nickname);
	} finally {
		await cleanupRoom(guestPage, roomName);
		await cleanupRoom(hostPage, roomName);
		await guestContext.close();
		await hostContext.close();
	}
});

test('玩家離開後房主名單即時移除該玩家', async ({ browser, request }) => {
	const host = createSmokeUser('leave-host');
	const guest = createSmokeUser('leave-guest');
	await seedSmokeUsers(request, [host, guest]);

	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();
	let roomName: string | undefined;

	try {
		await loginThroughApi(hostPage, host);
		await loginThroughApi(guestPage, guest);
		roomName = await createRoomThroughUi(hostPage);
		await joinRoomThroughUi(guestPage, roomName);
		await expect(hostPage.getByTestId('players-section')).toContainText(guest.nickname);

		await leaveRoomThroughUi(guestPage, roomName);
		await expect(hostPage.getByTestId('players-section')).not.toContainText(guest.nickname);
	} finally {
		await cleanupRoom(guestPage, roomName);
		await cleanupRoom(hostPage, roomName);
		await guestContext.close();
		await hostContext.close();
	}
});
