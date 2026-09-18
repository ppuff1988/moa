import { describe, expect, it } from 'vitest';
import type { Player } from '$lib/types/game';
import { mergeRoomPresence } from '../roomPresence';

const currentPlayer: Player = {
	id: 1,
	userId: 10,
	nickname: '玩家一',
	roleId: 3,
	roleName: '藥不然',
	isHost: false,
	isReady: true,
	isOnline: true,
	roomPresence: 'active',
	leftAt: null
};

describe('mergeRoomPresence', () => {
	it('更新 presence 時保留玩家 endpoint 提供的私人角色與遊戲狀態', () => {
		const incomingPlayer: Player = {
			...currentPlayer,
			roleId: null,
			roleName: null,
			isReady: false,
			isOnline: false,
			roomPresence: 'left',
			leftAt: null
		};

		expect(mergeRoomPresence([currentPlayer], [incomingPlayer])).toEqual([
			{
				...currentPlayer,
				isOnline: false,
				roomPresence: 'left',
				leftAt: null
			}
		]);
	});

	it('保留 room-update 中出現的新玩家', () => {
		const incomingPlayer: Player = {
			...currentPlayer,
			id: 2,
			userId: 11,
			nickname: '玩家二',
			roleId: null,
			roleName: null
		};

		expect(mergeRoomPresence([], [incomingPlayer])).toEqual([incomingPlayer]);
	});

	it('舊版 room-update 缺少 roomPresence 時保留目前的離房狀態', () => {
		const leftPlayer: Player = { ...currentPlayer, roomPresence: 'left' };
		const legacyIncomingPlayer: Player = {
			...leftPlayer,
			isOnline: false,
			roomPresence: undefined
		};

		expect(mergeRoomPresence([leftPlayer], [legacyIncomingPlayer])).toEqual([
			{
				...leftPlayer,
				isOnline: false,
				roomPresence: 'left',
				leftAt: null
			}
		]);
	});

	it('新的 room-update 明確回傳 null leftAt 時可以清除舊值', () => {
		const leftAt = new Date('2026-01-01T00:00:00.000Z');
		const leftPlayer: Player = { ...currentPlayer, leftAt };
		const returnedPlayer: Player = { ...leftPlayer, leftAt: null, roomPresence: 'active' };

		expect(mergeRoomPresence([leftPlayer], [returnedPlayer])[0].leftAt).toBeNull();
	});
});
