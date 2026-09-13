import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Socket 多分頁在線狀態', () => {
	const socketServers = ['src/lib/server/socket.ts', 'scripts/production-server.js'];

	it.each(socketServers)('%s 以 socket id 追蹤同一玩家的多條連線', (file) => {
		const source = readFileSync(resolve(process.cwd(), file), 'utf8');

		expect(source).toContain('socket.id');
		expect(source).toMatch(/Set<string>|new Set\(\)/);
		expect(source).toMatch(/delete\(socketId\)/);
		expect(source).toContain('removeRoomConnection(roomName, userId, socket.id)');
		expect(source).toMatch(/remainingConnections|hasRemainingConnection/);
	});

	it.each(socketServers)('%s 啟動時清除進行中遊戲的殘留在線狀態', (file) => {
		const source = readFileSync(resolve(process.cwd(), file), 'utf8');

		expect(source).toContain('resetActivePlayerPresence');
	});

	it.each(socketServers)('%s 加入房間途中斷線時不留下幽靈在線狀態', (file) => {
		const source = readFileSync(resolve(process.cwd(), file), 'utf8');
		const joinStart = source.indexOf("socket.on('join-room'");
		const joinEnd = source.indexOf("socket.on('leave-room'", joinStart);
		const joinHandler = source.slice(joinStart, joinEnd);

		const onlineUpdateIndex = joinHandler.indexOf('is_online = true');
		const updatePlayerOnlineStatusIndex = joinHandler.indexOf(
			'updatePlayerOnlineStatus(game.id, userId, true'
		);
		expect(joinHandler.indexOf('addRoomConnection(roomName, userId, socket.id)')).toBeLessThan(
			onlineUpdateIndex >= 0 ? onlineUpdateIndex : updatePlayerOnlineStatusIndex
		);
		expect(joinHandler).toContain('if (!socket.connected)');
		const disconnectedBranch = joinHandler.slice(joinHandler.indexOf('if (!socket.connected)'));
		expect(disconnectedBranch).toContain('const remainingConnections = removeRoomConnection');
		expect(disconnectedBranch).toMatch(
			/if \(remainingConnections === 0(?: && !hasRoomConnection\(roomName, userId\))?\)[\s\S]*(?:updatePlayerOnlineStatus|pool\.query)/
		);
	});

	it.each(socketServers)('%s 完成遊戲查詢後重新確認連線再標記離線', (file) => {
		const source = readFileSync(resolve(process.cwd(), file), 'utf8');
		const hasConnectionHelper = source.match(
			/(?:hasTrackedRoomConnection|hasRoomConnection)\(roomName, userId\)/g
		);

		expect(hasConnectionHelper?.length ?? 0).toBeGreaterThan(0);
		const lastConnectionCheck = Math.max(
			source.lastIndexOf('hasTrackedRoomConnection(roomName, userId)'),
			source.lastIndexOf('hasRoomConnection(roomName, userId)')
		);
		const lastOfflineUpdate = Math.max(
			source.lastIndexOf('updatePlayerOnlineStatus(game.id, userId, false)'),
			source.lastIndexOf('UPDATE game_players SET is_online = false')
		);

		expect(lastConnectionCheck).toBeGreaterThan(-1);
		expect(lastConnectionCheck).toBeLessThan(lastOfflineUpdate);
	});
});
