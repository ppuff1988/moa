import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runGuardMock } = vi.hoisted(() => ({ runGuardMock: vi.fn() }));

vi.mock('$lib/server/api-helpers', () => ({
	runCurrentActionTransaction: runGuardMock,
	getNextActionOrdering: vi.fn(),
	checkPlayerCanAction: vi.fn(),
	countActionsByType: vi.fn()
}));

const skillEndpoints = [
	['attack-player', () => import('./attack-player/+server')],
	['block-artifact', () => import('./block-artifact/+server')],
	['identify-artifact', () => import('./identify-artifact/+server')],
	['identify-player', () => import('./identify-player/+server')],
	['swap-artifacts', () => import('./swap-artifacts/+server')]
] as const;

describe('skill action authorization', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		runGuardMock.mockResolvedValue({
			error: new Response(JSON.stringify({ message: '目前不是你的行動回合' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			})
		});
	});

	it.each(skillEndpoints)('%s 會套用 current-action guard', async (_name, loadEndpoint) => {
		const { POST } = await loadEndpoint();
		const handler = POST as unknown as (event: {
			request: Request;
			params: { name: string };
		}) => Promise<Response>;
		const response = await handler({
			request: new Request('http://localhost', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			}),
			params: { name: '123456' }
		});

		expect(response.status).toBe(403);
		expect(runGuardMock).toHaveBeenCalledOnce();
	});
});
