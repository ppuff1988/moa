import { expect, test } from '@playwright/test';
import {
	cleanupRoom,
	createRoomThroughUi,
	createSmokeUser,
	joinRoomThroughUi,
	loginThroughApi,
	seedSmokeUsers
} from './fixtures';

test('未登入、非房主與非 action 階段的操作都被拒絕', async ({ browser, request }) => {
	const host = createSmokeUser('guard-host');
	const guest = createSmokeUser('guard-guest');
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

		const unauthenticatedStart = await request.post(`/api/room/${roomName}/start`, { data: {} });
		expect(unauthenticatedStart.status()).toBe(401);

		const nonHostStart = await guestPage.request.post(`/api/room/${roomName}/start`, { data: {} });
		expect(nonHostStart.status()).toBe(403);
		expect(await nonHostStart.json()).toMatchObject({ message: '只有房主可以執行此操作' });

		const nextPlayer = await guestPage.request.post(`/api/room/${roomName}/next-player`, {
			data: { nextPlayerId: 1 }
		});
		expect(nextPlayer.status()).toBe(400);
		expect(await nextPlayer.json()).toMatchObject({ message: '遊戲尚未開始' });

		const discussion = await guestPage.request.post(`/api/room/${roomName}/start-discussion`, {
			data: {}
		});
		expect(discussion.status()).toBe(400);
		expect(await discussion.json()).toMatchObject({ message: '遊戲尚未開始' });
	} finally {
		await cleanupRoom(guestPage, roomName);
		await cleanupRoom(hostPage, roomName);
		await guestContext.close();
		await hostContext.close();
	}
});
