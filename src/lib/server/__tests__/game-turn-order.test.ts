import { describe, expect, it } from 'vitest';
import { getAttackedRound, hasPlayerTakenTurn } from '../game-turn-order';

describe('game turn order', () => {
	it('treats a player in actionOrder as having taken a turn even without an action record', () => {
		const actionOrder = [1461, 1459, 1458, 1460, 1464, 1463, 1465];

		expect(hasPlayerTakenTurn(actionOrder, 1465)).toBe(true);
		expect(getAttackedRound(2, actionOrder, 1465)).toBe(3);
	});

	it('applies an attack in the current round when the target has not taken a turn', () => {
		const actionOrder = [1461, 1463, 1460, 1459, 1458];

		expect(hasPlayerTakenTurn(actionOrder, 1462)).toBe(false);
		expect(getAttackedRound(1, actionOrder, 1462)).toBe(1);
	});

	it('does not treat the current player as having completed their turn', () => {
		const actionOrder = [1465, 1463, 1464];

		expect(hasPlayerTakenTurn(actionOrder, 1465)).toBe(false);
		expect(getAttackedRound(2, actionOrder, 1465)).toBe(2);
	});

	it('handles an absent or malformed action order conservatively', () => {
		expect(getAttackedRound(2, null, 1465)).toBe(2);
		expect(getAttackedRound(2, {}, 1465)).toBe(2);
	});
});
