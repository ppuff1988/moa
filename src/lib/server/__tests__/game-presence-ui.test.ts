import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('遊戲頁房間離開狀態', () => {
	const source = readFileSync(
		resolve(process.cwd(), 'src/routes/room/[name]/game/+page.svelte'),
		'utf8'
	);

	it('只有明確離開房間的玩家才顯示等待重新加入狀態', () => {
		expect(source).toContain('leftRoomPlayers');
		expect(source).toContain('已離開房間');
		expect(source).toContain('等待玩家重新加入');
		expect(source).not.toContain('offlinePlayers');
		expect(source).not.toContain('遊戲暫停');
	});

	it('收到房間更新與玩家離開事件時立即刷新玩家狀態', () => {
		expect(source).toMatch(/socket\.on\('room-update', \(data/);
		expect(source).toContain('mergeRoomPresence($players, data.players)');
		expect(source).toContain('players.set(mergedPlayers)');
		expect(source).toContain("socket.on('player-left-room'");
	});

	it('玩家輪詢 API 持續回傳 isOnline，避免刷新後誤判', () => {
		const playersEndpoint = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/players/+server.ts'),
			'utf8'
		);

		expect(playersEndpoint).toContain('isOnline: gamePlayers.isOnline');
		expect(playersEndpoint).toContain('isOnline: player.isOnline');
	});

	it('玩家資料包含房間狀態，讓前端區分暫時斷線與明確離開', () => {
		const playersEndpoint = readFileSync(
			resolve(process.cwd(), 'src/routes/api/room/[name]/players/+server.ts'),
			'utf8'
		);

		expect(playersEndpoint).toContain('leftAt: gamePlayers.leftAt');
		expect(playersEndpoint).toContain('leftAt: player.leftAt');
		expect(playersEndpoint).toContain('roomPresence: gamePlayers.roomPresence');
		expect(playersEndpoint).toContain('roomPresence: player.roomPresence');
	});

	it('明確離開玩家回來後會嘗試恢復已完成提交的線上投票', () => {
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

	it('遊戲進行中提供明確離開房間操作', () => {
		const headerActions = readFileSync(
			resolve(process.cwd(), 'src/lib/components/shared/HeaderActions.svelte'),
			'utf8'
		);

		expect(headerActions).toContain("gameStatus === 'waiting' || gameStatus === 'playing'");
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
