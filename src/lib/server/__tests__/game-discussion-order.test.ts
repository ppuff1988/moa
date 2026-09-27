import { describe, expect, it } from 'vitest';
import * as order from '../game-turn-order';

const players = Array.from({ length: 6 }, (_, index) => ({
	id: index + 1,
	nickname: `玩家${index + 1}`,
	color: '紅',
	colorCode: '#ef4444'
}));

describe('discussion order', () => {
	it('starts at the last actor’s left neighbour and retains both positions', () => {
		expect(order).toHaveProperty('buildDiscussionOrder');
		const result = order.buildDiscussionOrder([1, 2, 3, 4, 5, 6], [3, 6, 4, 1, 5, 2], players);
		expect(result.seatOrder).toEqual([1, 2, 3, 4, 5, 6]);
		expect(result.players.map((player) => player.playerId)).toEqual([4, 5, 6, 1, 2, 3]);
		expect(result.players.map((player) => player.actionPosition)).toEqual([4, 2, 5, 3, 1, 6]);
		expect(result.players.map((player) => player.speakingPosition)).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('wraps around from the final seat', () => {
		expect(order).toHaveProperty('buildDiscussionOrder');
		expect(
			order
				.buildDiscussionOrder([1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1], players)
				.players.map((player) => player.playerId)
		).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it.each([null, [1, 2, 3], [1, 2, 3, 4, 5, 5], [1, 2, 3, 4, 5, 99]].map((seats) => [seats]))(
		'keeps chronological action positions without inventing seats for %j',
		(seats) => {
			expect(order).toHaveProperty('buildDiscussionOrder');
			const result = order.buildDiscussionOrder(seats, [3, 6, 4, 1, 5, 2], players);
			expect(result.seatOrder).toBeNull();
			expect(result.players.map((player) => player.playerId)).toEqual([2, 5, 1, 4, 6, 3]);
			expect(result.players.every((player) => player.speakingPosition === null)).toBe(true);
		}
	);

	it('does not publish a final speaking order while action is incomplete', () => {
		expect(order).toHaveProperty('buildDiscussionOrder');
		const result = order.buildDiscussionOrder([1, 2, 3, 4, 5, 6], [3, 1], players, false);
		expect(result.players).toHaveLength(6);
		expect(result.players.every((player) => player.speakingPosition === null)).toBe(true);
		expect(result.players.find((player) => player.playerId === 6)?.actionPosition).toBeNull();
	});

	it('rejects duplicate action records rather than assigning false speaking positions', () => {
		expect(order).toHaveProperty('buildDiscussionOrder');
		const result = order.buildDiscussionOrder([1, 2, 3, 4, 5, 6], [3, 3, 4, 1, 5, 2], players);
		expect(result.players.every((player) => player.speakingPosition === null)).toBe(true);
	});
});
