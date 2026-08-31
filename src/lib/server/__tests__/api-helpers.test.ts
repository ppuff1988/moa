import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, queriedValues, updateWhereMock } = vi.hoisted(() => ({
	dbMock: {
		select: vi.fn(),
		update: vi.fn()
	},
	queriedValues: [] as unknown[],
	updateWhereMock: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('drizzle-orm', async (importOriginal) => {
	const actual = await importOriginal<typeof import('drizzle-orm')>();
	return {
		...actual,
		eq: (_column: unknown, value: unknown) => ({ type: 'eq', value }),
		and: (...conditions: unknown[]) => ({ type: 'and', conditions })
	};
});

vi.mock('../db', () => ({ db: dbMock }));
vi.mock('../auth', () => ({
	getUserFromJWT: vi.fn(),
	verifyJWTWithError: vi.fn()
}));
vi.mock('../lucia', () => ({ lucia: {} }));

import { restoreCanActionIfNeeded } from '../api-helpers';

type Condition = {
	type: 'eq' | 'and';
	value?: unknown;
	conditions?: Condition[];
};

function collectValues(condition: Condition): unknown[] {
	if (condition.type === 'eq') return [condition.value];
	return condition.conditions?.flatMap(collectValues) ?? [];
}

describe('restoreCanActionIfNeeded', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		queriedValues.length = 0;

		dbMock.select.mockImplementation(() => ({
			from: () => ({
				where: (condition: Condition) => {
					const values = collectValues(condition);
					queriedValues.push(...values);

					const result = values.includes(202)
						? [{ actionData: { type: 'identify_artifact' } }]
						: [];

					return {
						limit: vi.fn().mockResolvedValue([{ id: 101 }]),
						then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
							Promise.resolve(result).then(resolve, reject)
					};
				}
			})
		}));

		dbMock.update.mockReturnValue({
			set: () => ({ where: updateWhereMock })
		});
	});

	it('使用指定的 roundId 查詢行動，避免讀到另一場遊戲的同回合資料', async () => {
		await restoreCanActionIfNeeded(42, 1, null, 1, 202, { checkArtifact: 1 });

		expect(queriedValues).toContain(202);
		expect(updateWhereMock).toHaveBeenCalledOnce();
	});
});
