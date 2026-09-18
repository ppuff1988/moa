import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('階段轉換與在線狀態必須在同一 transaction', () => {
	const wrappedRoutes = [
		'src/routes/api/room/[name]/start/+server.ts',
		'src/routes/api/room/[name]/start-selection/+server.ts',
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

		expect(source).toContain('requireAllPlayersPresent(game.id, tx, true)');
	});

	it('resume-paused-game 依 game、active players、round 順序鎖定恢復交易', () => {
		const source = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/resume-paused-game/+server.ts'),
			'utf8'
		);

		expect(source).toContain("from '$lib/server/api-helpers'");
		expect(source).toContain('requireAllPlayersPresent(game.id, tx, true)');
		expect(source).toMatch(/select\(\)\s*\.from\(games\)[\s\S]*?\.for\('update'\)/);
		expect(source).toMatch(
			/requireAllPlayersPresent\(game\.id, tx, true\)[\s\S]*?select\(\)\s*\.from\(gameRounds\)[\s\S]*?\.for\('update'\)/
		);
	});

	it('start 的初始階段也在啟動遊戲前鎖定在線玩家', () => {
		const source = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/start/+server.ts'),
			'utf8'
		);

		expect(source).toMatch(
			/runAllPlayersOnlineTransaction\(game\.id,[\s\S]*?startRoleSelection\(game\.id, transaction\)/
		);
		expect(source).toMatch(
			/runAllPlayersOnlineTransaction\(game\.id,[\s\S]*?startGame\(game\.id, transaction\)/
		);
	});

	it('自動分派遊戲在同一 transaction 內鎖定在線玩家', () => {
		const source = readFileSync(resolve(process.cwd(), 'src/lib/server/game.ts'), 'utf8');

		expect(source).toContain('requireAllPlayersPresent(gameId, tx, true)');
	});

	it('手動開始遊戲在 transaction commit 後才廣播 game-started', () => {
		const source = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/start/+server.ts'),
			'utf8'
		);

		expect(source).toMatch(
			/const transition = await runAllPlayersOnlineTransaction\(game\.id,[\s\S]*?const result = transition\.data[\s\S]*?getSocketIO[\s\S]*?emit\('game-started'/
		);
	});
});
