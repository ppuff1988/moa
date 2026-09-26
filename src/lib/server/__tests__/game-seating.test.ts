import { describe, expect, it, vi } from 'vitest';
vi.mock('../db', () => ({ db: {} }));
import * as game from '../game';

describe('starting seats', () => {
	it.each([6, 7, 8])('shuffles every player once for %i players', (count) => {
		expect(game).toHaveProperty('resolveStartingSeats');
		const ids = Array.from({ length: count }, (_, i) => i + 1);
		const result = game.resolveStartingSeats('random', null, ids, () => 0);
		expect([...result].sort()).toEqual([...ids].sort());
		expect(result).not.toEqual(ids);
	});
	it('preserves the host’s physical seating order exactly', () => {
		expect(game).toHaveProperty('resolveStartingSeats');
		const seats = [3, 1, 2, 6, 5, 4];
		expect(game.resolveStartingSeats('manual', seats, [1, 2, 3, 4, 5, 6])).toEqual(seats);
	});
	it('requires manual seats to match the current roster before starting', () => {
		expect(game).toHaveProperty('resolveStartingSeats');
		expect(() =>
			game.resolveStartingSeats('manual', [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 7])
		).toThrow('座位');
	});
});
