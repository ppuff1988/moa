import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('階段轉換與在線狀態必須在同一 transaction', () => {
	const wrappedRoutes = [
		'src/routes/api/room/[name]/start/+server.ts',
		'src/routes/api/room/[name]/start-voting/+server.ts',
		'src/routes/api/room/[name]/complete-voting/+server.ts',
		'src/routes/api/room/[name]/calculate-settlement/+server.ts'
	];
	const existingTransactions = [
		'src/routes/api/room/[name]/submit-votes/+server.ts',
		'src/routes/api/room/[name]/online-voting/+server.ts'
	];

	it.each(wrappedRoutes)('%s 使用原子化在線狀態 transaction', (file) => {
		const source = readFileSync(resolve(process.cwd(), file), 'utf8');

		expect(source).toContain('runAllPlayersOnlineTransaction');
	});

	it.each(existingTransactions)('%s 在既有 transaction 內鎖定在線狀態', (file) => {
		const source = readFileSync(resolve(process.cwd(), file), 'utf8');

		expect(source).toContain('requireAllPlayersOnline(game.id, tx, true)');
	});

	it('resume-paused-game 依 game、active players、round 順序鎖定恢復交易', () => {
		const source = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/resume-paused-game/+server.ts'),
			'utf8'
		);

		expect(source).toContain("from '$lib/server/api-helpers'");
		expect(source).toContain('requireAllPlayersOnline(game.id, tx, true)');
		expect(source).toMatch(/select\(\)\s*\.from\(games\)[\s\S]*?\.for\('update'\)/);
		expect(source).toMatch(
			/requireAllPlayersOnline\(game\.id, tx, true\)[\s\S]*?select\(\)\s*\.from\(gameRounds\)[\s\S]*?\.for\('update'\)/
		);
	});
});
