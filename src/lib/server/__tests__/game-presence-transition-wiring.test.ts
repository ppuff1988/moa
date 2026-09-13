import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('遊戲階段轉換在線狀態保護', () => {
	const transitionRoutes = [
		'src/routes/api/room/[name]/start/+server.ts',
		'src/routes/api/room/[name]/start-voting/+server.ts',
		'src/routes/api/room/[name]/complete-voting/+server.ts',
		'src/routes/api/room/[name]/submit-votes/+server.ts',
		'src/routes/api/room/[name]/online-voting/+server.ts',
		'src/routes/api/room/[name]/calculate-settlement/+server.ts'
	];

	it.each(transitionRoutes)('%s 在改變階段前確認全員在線', (file) => {
		const source = readFileSync(resolve(process.cwd(), file), 'utf8');

		expect(
			source.includes('runAllPlayersOnlineTransaction') ||
				source.includes('requireAllPlayersOnline')
		).toBe(true);
		if (!source.includes('runAllPlayersOnlineTransaction')) {
			expect(source).toMatch(/await requireAllPlayersOnline\(game\.id/);
		}
	});
});
