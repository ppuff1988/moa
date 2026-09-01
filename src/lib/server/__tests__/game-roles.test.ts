import { describe, expect, it } from 'vitest';
import { createRandomAssignments, GAME_ROLES } from '../game';

const allRoles = ['許愿', '黃煙煙', '方震', '木戶加奈', '老朝奉', '藥不然', '鄭國渠', '姬云浮'].map(
	(name, index) => ({ id: index + 1, name })
);

describe('game role configuration', () => {
	it('uses the correct roles for 6, 7, and 8 player games', () => {
		expect(GAME_ROLES).toEqual({
			6: {
				good: ['許愿', '黃煙煙', '方震', '木戶加奈'],
				bad: ['老朝奉', '藥不然']
			},
			7: {
				good: ['許愿', '黃煙煙', '方震', '木戶加奈'],
				bad: ['老朝奉', '鄭國渠', '藥不然']
			},
			8: {
				good: ['許愿', '黃煙煙', '方震', '木戶加奈', '姬云浮'],
				bad: ['老朝奉', '鄭國渠', '藥不然']
			}
		});
	});

	it.each([6, 7, 8])('creates unique role and color assignments for %i players', (playerCount) => {
		const playerIds = Array.from({ length: playerCount }, (_, index) => index + 101);
		const assignments = createRandomAssignments(playerIds, allRoles, () => 0.25);

		expect(assignments).toHaveLength(playerCount);
		expect(new Set(assignments.map((assignment) => assignment.roleId)).size).toBe(playerCount);
		expect(new Set(assignments.map((assignment) => assignment.color)).size).toBe(playerCount);
		expect(new Set(assignments.map((assignment) => assignment.playerId))).toEqual(
			new Set(playerIds)
		);
	});
});
