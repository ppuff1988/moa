import { render } from 'vitest-browser-svelte';
import { afterEach, expect, it, vi } from 'vitest';
import SeatingSetup from './SeatingSetup.svelte';

afterEach(() => vi.unstubAllGlobals());

it('saves physical seats in left-neighbour order and requires saving new adjustments', async () => {
	let seats: number[] | null = null;
	const onready = vi.fn();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_url: string, options?: RequestInit) => {
			if (options?.method === 'PATCH') seats = JSON.parse(options.body as string).seatOrder;
			return new Response(
				JSON.stringify({
					seatingMode: 'manual',
					seatOrder: seats,
					editable: true,
					players: [
						{ id: 1, userId: 10, nickname: '小安', isHost: true },
						{ id: 2, userId: 20, nickname: '小美', isHost: false },
						{ id: 3, userId: 30, nickname: '阿哲', isHost: false }
					]
				})
			);
		})
	);
	const screen = render(SeatingSetup, {
		roomName: 'test',
		currentUserId: 10,
		isHost: true,
		onready
	});
	await screen.getByRole('button', { name: '將阿哲往前移' }).click();
	expect(onready).toHaveBeenLastCalledWith(false);
	await screen.getByRole('button', { name: '確認現場座位' }).click();
	await expect.poll(() => seats).toEqual([1, 3, 2]);
	await expect.poll(() => onready.mock.lastCall).toEqual([true]);
	await expect.element(screen.getByText(/你的左邊：阿哲/)).toBeVisible();
	await expect.element(screen.getByText(/你的右邊：小美/)).toBeVisible();
	await screen.getByRole('button', { name: '將阿哲往後移' }).click();
	await expect.poll(() => onready.mock.lastCall).toEqual([false]);
});

it('shows neighbours to guests without exposing ordering controls', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						seatingMode: 'manual',
						seatOrder: [1, 3, 2],
						editable: true,
						players: [
							{ id: 1, userId: 10, nickname: '小安', isHost: true },
							{ id: 2, userId: 20, nickname: '小美', isHost: false },
							{ id: 3, userId: 30, nickname: '阿哲', isHost: false }
						]
					})
				)
		)
	);
	const screen = render(SeatingSetup, { roomName: 'test', currentUserId: 20, isHost: false });
	await expect.element(screen.getByText(/你的左邊：小安/)).toBeVisible();
	await expect.element(screen.getByText(/你的右邊：阿哲/)).toBeVisible();
	await expect
		.element(screen.getByRole('button', { name: '確認現場座位' }))
		.not.toBeInTheDocument();
});
