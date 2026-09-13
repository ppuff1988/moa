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
			leftAt: null
		};

		expect(mergeRoomPresence([currentPlayer], [incomingPlayer])).toEqual([
			{
				...currentPlayer,
				isOnline: false,
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
});
