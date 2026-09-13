import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('遊戲頁離線暫停提示', () => {
	const source = readFileSync(
		resolve(process.cwd(), 'src/routes/room/[name]/game/+page.svelte'),
		'utf8'
	);

	it('依玩家在線狀態顯示等待名單', () => {
		expect(source).toContain('offlinePlayers');
		expect(source).toContain('遊戲暫停');
		expect(source).toContain('等待以下玩家重新連線');
	});

	it('收到 room-update 與 player-offline 時立即刷新玩家狀態', () => {
		expect(source).toMatch(/socket\.on\('room-update', \(data/);
		expect(source).toContain('players.set(data.players)');
		expect(source).toContain("socket.on('player-offline'");
	});

	it('玩家輪詢 API 持續回傳 isOnline，避免刷新後誤判', () => {
		const playersEndpoint = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/players/+server.ts'),
			'utf8'
		);

		expect(playersEndpoint).toContain('isOnline: gamePlayers.isOnline');
		expect(playersEndpoint).toContain('isOnline: player.isOnline');
	});

	it('正式離房玩家不會被列入暫停等待名單', () => {
		const playersEndpoint = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/players/+server.ts'),
			'utf8'
		);

		expect(playersEndpoint).toContain('leftAt: gamePlayers.leftAt');
		expect(playersEndpoint).toContain('leftAt: player.leftAt');
		expect(source).toContain('player.leftAt == null && !player.isOnline');
		expect(source).toContain('p.leftAt == null && !p.isOnline');
	});

	it('全員重連後會嘗試恢復已完成提交的線上投票', () => {
		const endpointPath = resolve(
			process.cwd(),
			'src/routes/api/room/[name]/resume-paused-game/+server.ts'
		);
		expect(existsSync(endpointPath)).toBe(true);
		if (!existsSync(endpointPath)) return;
		const resumeEndpoint = readFileSync(endpointPath, 'utf8');

		expect(source).toContain('/resume-paused-game');
		expect(resumeEndpoint).toContain('finalizeOnlineVotingIfComplete');
		expect(resumeEndpoint).toContain("emitToRoom(game.roomName, 'voting-completed'");
	});

	it('lobby socket 自動重連後重新加入房間', () => {
		const lobbySource = readFileSync(
			resolve(process.cwd(), 'src/lib/composables/useRoomLobby.ts'),
			'utf8'
		);

		expect(lobbySource).toContain("socket.on('connect', joinRoomSocket)");
		expect(lobbySource).toContain("socket.off('connect', joinRoomSocket)");
	});
});
