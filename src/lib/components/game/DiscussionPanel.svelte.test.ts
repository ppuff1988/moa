import { render } from 'vitest-browser-svelte';
import { afterEach, expect, it, vi } from 'vitest';
import DiscussionPanel from './DiscussionPanel.svelte';
import type { DiscussionData, DiscussionNote, NotePatch } from '$lib/types/discussion';
import { applyNoteChange, emptyNote } from '$lib/utils/discussion';
import { page } from '@vitest/browser/context';

const data: DiscussionData = {
	gameId: 'example',
	ownerPlayerId: 1,
	round: 1,
	availableRounds: [1],
	editable: true,
	notesAvailable: true,
	seatOrder: [1, 2],
	players: [
		{
			playerId: 1,
			nickname: '小安',
			color: '紅',
			colorCode: '#ef4444',
			seatPosition: 1,
			actionPosition: 2,
			speakingPosition: 1
		},
		{
			playerId: 2,
			nickname: '小美',
			color: '藍',
			colorCode: '#3b82f6',
			seatPosition: 2,
			actionPosition: 1,
			speakingPosition: 2
		}
	],
	artifacts: [
		{ id: 10, animal: '鼠' },
		{ id: 11, animal: '牛' },
		{ id: 12, animal: '虎' },
		{ id: 13, animal: '兔' }
	],
	myClaims: { 10: 'genuine', 11: 'fake', 12: 'unable' }
};
afterEach(() => {
	vi.unstubAllGlobals();
	sessionStorage.clear();
});

it('edits a private alignment inline and keeps it through sorting, views and clearing', async () => {
	let note = emptyNote(2);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, options?: RequestInit) => {
			if (options?.method === 'PATCH') {
				const patch = JSON.parse(options.body as string) as NotePatch;
				note = { ...applyNoteChange(note, patch.change), version: note.version + 1 };
				return new Response(JSON.stringify({ conflict: false, note }));
			}
			return new Response(
				JSON.stringify(url.includes('discussion-notes') ? { notes: [note] } : data)
			);
		})
	);
	const screen = render(DiscussionPanel, {
		roomName: 'test',
		userId: 100,
		currentRound: 1,
		phase: 'discussion'
	});
	const heading = screen.getByRole('button', { name: /發言 2.*小美/ });
	await expect.element(heading).toHaveTextContent('未判斷');
	await heading.click();
	const judgment = screen.getByRole('group', { name: '小美的陣營判斷' });
	await judgment.getByRole('button', { name: '偏壞人', exact: true }).click();
	await expect.element(heading).toHaveTextContent('偏壞人');
	await expect
		.element(judgment.getByRole('button', { name: '偏壞人', exact: true }))
		.toHaveAttribute('aria-pressed', 'true');
	await expect.poll(() => note.version).toBe(1);
	await screen.getByRole('button', { name: '依行動', exact: true }).click();
	await expect.element(judgment).toBeVisible();
	await screen.getByRole('button', { name: '按獸首對照', exact: true }).click();
	await screen.getByRole('button', { name: '按玩家記錄', exact: true }).click();
	await expect.element(heading).toHaveTextContent('偏壞人');
	await judgment.getByRole('button', { name: '未判斷', exact: true }).click();
	await expect.element(heading).toHaveTextContent('未判斷');
	await expect.poll(() => note.version).toBe(2);
});

it('shows saved alignment but disables editing when a game has ended', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			async (url: string) =>
				new Response(
					JSON.stringify(
						url.includes('discussion-notes')
							? { notes: [{ ...emptyNote(2), alignment: 'good' }] }
							: { ...data, editable: false }
					)
				)
		)
	);
	const screen = render(DiscussionPanel, {
		roomName: 'test',
		userId: 100,
		currentRound: 1,
		phase: 'finished'
	});
	await screen.getByRole('button', { name: '私人筆記', exact: true }).click();
	const heading = screen.getByRole('button', { name: /發言 2.*小美/ });
	await expect.element(heading).toHaveTextContent('偏好人');
	await heading.click();
	const judgment = screen.getByRole('group', { name: '小美的陣營判斷' });
	for (const label of ['偏好人', '未判斷', '偏壞人']) {
		await expect.element(judgment.getByRole('button', { name: label, exact: true })).toBeDisabled();
	}
});

it.each([6, 7, 8])(
	'fits alignment controls with %i players and long names on phones',
	async (count) => {
		const players = Array.from({ length: count }, (_, index) => ({
			...data.players[0],
			playerId: index + 1,
			nickname:
				index === 0
					? '這是一個很長很長的玩家名稱用來確認手機不會水平溢出'
					: `PlayerWithALongUnbrokenName${index}`,
			speakingPosition: index + 1,
			actionPosition: count - index
		}));
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async (url: string) =>
					new Response(
						JSON.stringify(
							url.includes('discussion-notes')
								? { notes: [] }
								: { ...data, players, seatOrder: players.map((p) => p.playerId) }
						)
					)
			)
		);
		const screen = render(DiscussionPanel, {
			roomName: 'test',
			userId: 100,
			currentRound: 1,
			phase: 'discussion'
		});
		await screen
			.getByRole('button', { name: new RegExp(`發言 1.*${players[0].nickname}`) })
			.click();
		const group = screen.getByRole('group', { name: `${players[0].nickname}的陣營判斷` });
		for (const width of [375, 390, 430, 1024, 1440]) {
			await page.viewport(width, 844);
			expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
			const boxes = group
				.getByRole('button')
				.elements()
				.map((button) => button.getBoundingClientRect());
			expect(boxes).toHaveLength(3);
			for (const box of boxes) {
				expect(box.width).toBeGreaterThanOrEqual(44);
				expect(box.height).toBeGreaterThanOrEqual(44);
				expect(box.right).toBeLessThanOrEqual(width);
			}
		}
	}
);

it('defaults to speaking order when action progresses into discussion', async () => {
	let inDiscussion = false;
	vi.stubGlobal(
		'fetch',
		vi.fn(
			async (url: string) =>
				new Response(
					JSON.stringify(
						url.includes('discussion-notes')
							? { notes: [] }
							: inDiscussion
								? data
								: {
										...data,
										notesAvailable: false,
										availableRounds: [],
										players: data.players.map((player) => ({ ...player, speakingPosition: null }))
									}
					)
				)
		)
	);
	const screen = render(DiscussionPanel, {
		roomName: 'test',
		userId: 100,
		currentRound: 1,
		phase: 'action'
	});
	await expect.element(screen.getByRole('button', { name: '查看座位 ›' })).toBeEnabled();
	inDiscussion = true;
	await screen.rerender({ phase: 'discussion' });
	await expect
		.element(screen.getByRole('button', { name: '依發言', exact: true }))
		.toHaveAttribute('aria-pressed', 'true');
});

it('loads the latest round when opening a finished game', async () => {
	const fetchMock = vi.fn(async (url: string) => {
		return new Response(
			JSON.stringify(
				url.includes('discussion-notes')
					? { notes: [] }
					: { ...data, round: 3, availableRounds: [1, 2, 3], editable: false }
			)
		);
	});
	vi.stubGlobal('fetch', fetchMock);

	render(DiscussionPanel, {
		roomName: 'test',
		userId: 100,
		currentRound: 1,
		phase: 'finished'
	});

	await vi.waitFor(() => {
		expect(fetchMock.mock.calls.some(([url]) => url === '/api/room/test/discussion')).toBe(true);
	});
	expect(fetchMock.mock.calls.some(([url]) => url === '/api/room/test/discussion?round=1')).toBe(
		false
	);
});

it('shows both positions, edits privately, and keeps the claim when switching views and sort', async () => {
	let note: DiscussionNote = emptyNote(1);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, options?: RequestInit) => {
			if (options?.method === 'PATCH') {
				const patch = JSON.parse(options.body as string) as NotePatch;
				note = { ...applyNoteChange(note, patch.change), version: note.version + 1 };
				return new Response(JSON.stringify({ conflict: false, note }));
			}
			return new Response(
				JSON.stringify(url.includes('discussion-notes') ? { notes: [note] } : data)
			);
		})
	);
	const screen = render(DiscussionPanel, {
		roomName: 'test',
		userId: 100,
		currentRound: 1,
		phase: 'discussion'
	});
	await expect.element(screen.getByText('私人筆記・只有你看得到')).toBeVisible();
	await screen.getByRole('button', { name: /發言 1.*小安/ }).click();
	await expect.element(screen.getByText('第 2 位行動').first()).toBeVisible();
	await screen.getByRole('button', { name: '記錄小安的鼠首說法' }).click();
	await screen.getByRole('button', { name: '偽', exact: true }).click();
	await expect.poll(() => note.artifactClaims['10']).toBe('fake');
	await screen.getByRole('button', { name: '依行動', exact: true }).click();
	const playerRows = screen.getByRole('button', { name: /^發言 \d/ }).elements();
	expect(playerRows[0]).toHaveTextContent('小美');
	expect(playerRows[1]).toHaveTextContent('小安');
	await expect.element(screen.getByRole('button', { name: '記錄小安的鼠首說法' })).toBeVisible();
	await screen.getByRole('button', { name: '按獸首對照', exact: true }).click();
	await expect.element(screen.getByText('我的鑑定：真')).toBeVisible();
	await expect.element(screen.getByText('偽', { exact: true }).last()).toBeVisible();
});

it('keeps four own results in one compact row on phones and places reference beside notes on desktop', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			async (url: string) =>
				new Response(
					JSON.stringify(
						url.includes('discussion-notes')
							? { notes: [{ ...emptyNote(1), artifactClaims: { 10: 'fake' } }] }
							: data
					)
				)
		)
	);
	const screen = render(DiscussionPanel, {
		roomName: 'test',
		userId: 100,
		currentRound: 1,
		phase: 'discussion'
	});
	const reference = screen.getByRole('region', { name: '本輪獸首・我的鑑定' });
	await expect.element(reference).toBeVisible();
	for (const [animal, result] of [
		['鼠', '真'],
		['牛', '偽'],
		['虎', '無法鑑定'],
		['兔', '未鑑定']
	]) {
		await expect
			.element(reference.getByRole('listitem', { name: `${animal}首：${result}` }))
			.toBeVisible();
	}
	for (const width of [375, 390, 430]) {
		await page.viewport(width, 844);
		const tiles = reference
			.getByRole('listitem')
			.elements()
			.map((el) => el.getBoundingClientRect());
		expect(tiles).toHaveLength(4);
		expect(new Set(tiles.map((tile) => Math.round(tile.top))).size).toBe(1);
		expect(reference.element().getBoundingClientRect().height).toBeLessThanOrEqual(150);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
	}
	await page.viewport(1280, 900);
	const left = reference.element().getBoundingClientRect();
	const right = screen
		.getByRole('button', { name: '按玩家記錄', exact: true })
		.element()
		.getBoundingClientRect();
	expect(left.right).toBeLessThanOrEqual(right.left);
	await screen.getByRole('button', { name: /發言 1.*小安/ }).click();
	const first = screen
		.getByRole('button', { name: '記錄小安的鼠首說法' })
		.element()
		.getBoundingClientRect();
	const second = screen
		.getByRole('button', { name: '記錄小安的牛首說法' })
		.element()
		.getBoundingClientRect();
	expect(Math.round(first.top)).toBe(Math.round(second.top));
	expect(first.right).toBeLessThan(second.left);
});

it('selects attacked from the claim menu for the whole round and allows correcting it', async () => {
	let note: DiscussionNote = {
		...emptyNote(1),
		artifactClaims: { 10: 'genuine' },
		memo: '保留備註'
	};
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, options?: RequestInit) => {
			if (options?.method === 'PATCH') {
				const patch = JSON.parse(options.body as string) as NotePatch;
				note = { ...applyNoteChange(note, patch.change), version: note.version + 1 };
				return new Response(JSON.stringify({ conflict: false, note }));
			}
			return new Response(
				JSON.stringify(url.includes('discussion-notes') ? { notes: [note] } : data)
			);
		})
	);
	const screen = render(DiscussionPanel, {
		roomName: 'test',
		userId: 100,
		currentRound: 1,
		phase: 'discussion'
	});
	await screen.getByRole('button', { name: /發言 1.*小安/ }).click();
	await expect
		.element(screen.getByRole('checkbox', { name: '自述被攻擊' }))
		.not.toBeInTheDocument();
	await screen.getByRole('button', { name: '記錄小安的鼠首說法' }).click();
	await screen.getByRole('button', { name: '被攻擊（無法鑑定）', exact: true }).click();
	await expect.poll(() => note.claimedAttacked).toBe(true);
	for (const artifact of data.artifacts) {
		await expect
			.element(screen.getByRole('button', { name: `記錄小安的${artifact.animal}首說法` }))
			.toHaveTextContent('被攻擊');
	}
	expect(note.artifactClaims).toEqual({});
	expect(note.memo).toBe('保留備註');
	await screen.getByRole('button', { name: '記錄小安的鼠首說法' }).click();
	await screen.getByRole('button', { name: '偽', exact: true }).click();
	await expect.poll(() => note.claimedAttacked).toBe(false);
	await expect
		.element(screen.getByRole('button', { name: '記錄小安的牛首說法' }))
		.toHaveTextContent('未記錄');
});
