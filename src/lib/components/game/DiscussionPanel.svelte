<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import type { DiscussionData } from '$lib/types/discussion';
	import { createDiscussionNotes } from '$lib/stores/discussionNotes';
	import { fetchDiscussion, fetchNotes, saveDiscussionNote } from '$lib/services/discussionService';
	import { emptyNote } from '$lib/utils/discussion';
	import DiscussionArtifacts from './DiscussionArtifacts.svelte';
	import DiscussionNotes from './DiscussionNotes.svelte';
	import ArtifactClaimsView from './ArtifactClaimsView.svelte';
	import SeatOrderDialog from './SeatOrderDialog.svelte';
	let {
		roomName,
		userId,
		currentRound,
		phase
	}: { roomName: string; userId: number; currentRound: number; phase: string } = $props();
	let data = $state<DiscussionData | null>(null);
	let selectedRound = $state(0);
	let visible = $state(false);
	let seatOpen = $state(false);
	let view: 'players' | 'artifacts' = $state('players');
	let sort: 'speaking' | 'action' = $state('speaking');
	let expanded: number | null = $state(null);
	let loading = $state(false);
	let errorMessage = $state('');
	let scope = '';
	let lastRound = 0;
	let requestId = 0;
	let destroyed = false;
	let notes = $state(
		createDiscussionNotes('', async () => {
			throw new Error('尚未載入');
		})
	);
	const shown = $derived(phase === 'discussion' || visible);
	const effectiveSort = $derived(
		data?.players.some((p) => p.speakingPosition !== null) ? sort : 'action'
	);
	const sortedPlayers = $derived(
		data
			? [...data.players].sort((a, b) =>
					effectiveSort === 'speaking'
						? (a.speakingPosition ?? a.actionPosition ?? 99) -
							(b.speakingPosition ?? b.actionPosition ?? 99)
						: (a.actionPosition ?? 99) - (b.actionPosition ?? 99)
				)
			: []
	);
	const status = $derived(
		Object.values($notes).some((e) => e.status === 'conflict')
			? '有版本衝突'
			: Object.values($notes).some((e) => e.status === 'error')
				? '尚未同步'
				: Object.values($notes).some((e) => e.status === 'saving')
					? '儲存中…'
					: '已儲存'
	);

	async function load(round?: number) {
		const sequence = ++requestId;
		loading = true;
		errorMessage = '';
		try {
			const next = await fetchDiscussion(roomName, round);
			const result = next.notesAvailable ? await fetchNotes(roomName, next.round) : { notes: [] };
			if (destroyed || sequence !== requestId) return;
			const nextScope = `${userId}:${next.gameId}`;
			if (nextScope !== scope) {
				notes.destroy();
				let storage: Storage | undefined;
				try {
					storage = sessionStorage;
				} catch {
					/* Saving can work without local drafts. */
				}
				notes = createDiscussionNotes(
					nextScope,
					(patch) => saveDiscussionNote(roomName, patch),
					storage
				);
				scope = nextScope;
			}
			if (next.notesAvailable)
				notes.load(
					next.round,
					next.players.map(
						(p) =>
							result.notes.find((n) => n.subjectPlayerId === p.playerId) ?? emptyNote(p.playerId)
					)
				);
			data = next;
			selectedRound = next.round;
		} catch (error) {
			if (sequence === requestId && !destroyed)
				errorMessage = error instanceof Error ? error.message : '載入失敗';
		} finally {
			if (sequence === requestId && !destroyed) loading = false;
		}
	}
	$effect(() => {
		const round = currentRound;
		void phase;
		void roomName;
		void userId;
		untrack(() => {
			const target =
				phase === 'finished' && lastRound === 0
					? undefined
					: lastRound === round && selectedRound
						? selectedRound
						: round;
			lastRound = round;
			void load(target);
		});
	});
	onDestroy(() => {
		destroyed = true;
		++requestId;
		notes.destroy();
	});
</script>

<section class="discussion" aria-label="討論與私人筆記">
	<div class="topline">
		{#if phase === 'discussion'}<h2>第 {currentRound} 輪・討論</h2>
		{:else}<button
				type="button"
				class="entry"
				aria-expanded={visible}
				onclick={() => (visible = !visible)}>{visible ? '收起私人筆記' : '私人筆記'}</button
			>{/if}
		<button type="button" class="seat-link" disabled={!data} onclick={() => (seatOpen = true)}
			>查看座位 ›</button
		>
	</div>
	{#if errorMessage}<div role="alert" class="error">
			{errorMessage}<button type="button" onclick={() => load(selectedRound || currentRound)}
				>重試</button
			>
		</div>{/if}
	<div hidden={!shown}>
		{#if data}
			{#if data.availableRounds.length}
				<label class="round-select"
					>筆記回合 <select
						value={selectedRound}
						disabled={loading}
						onchange={(event) => load(Number(event.currentTarget.value))}
					>
						{#if !data.availableRounds.includes(selectedRound)}<option value={selectedRound}
								>第 {selectedRound} 輪（行動中）</option
							>{/if}
						{#each data.availableRounds as round (round)}<option value={round}>第 {round} 輪</option
							>{/each}
					</select></label
				>
			{/if}
			<div class="discussion-layout">
				<aside class="reference" aria-label="本輪參考資訊">
					<DiscussionArtifacts artifacts={data.artifacts} myClaims={data.myClaims} />
				</aside>
				<div class="notebook">
					{#if data.notesAvailable}
						<div class="view-tabs" aria-label="筆記視圖">
							<button
								type="button"
								class:active={view === 'players'}
								aria-pressed={view === 'players'}
								onclick={() => (view = 'players')}>按玩家記錄</button
							>
							<button
								type="button"
								class:active={view === 'artifacts'}
								aria-pressed={view === 'artifacts'}
								onclick={() => (view = 'artifacts')}>按獸首對照</button
							>
						</div>
						<div class="privacy">
							<span>私人筆記・只有你看得到</span><span role="status">{status}</span>
						</div>
						{#if !data.editable}<p class="hint">遊戲已結束，筆記僅供回看。</p>{/if}
						{#if view === 'players'}
							<div class="sort">
								<span>排序</span><button
									type="button"
									disabled={!data.players.some((p) => p.speakingPosition !== null)}
									class:chosen={effectiveSort === 'speaking'}
									aria-pressed={effectiveSort === 'speaking'}
									onclick={() => (sort = 'speaking')}>依發言</button
								>
								<button
									type="button"
									class:chosen={effectiveSort === 'action'}
									aria-pressed={effectiveSort === 'action'}
									onclick={() => (sort = 'action')}>依行動</button
								>
							</div>
							{#if !data.seatOrder}<p class="hint">此局未建立座位，以行動順序查看。</p>{/if}
							<DiscussionNotes
								{data}
								players={sortedPlayers}
								entries={$notes}
								bind:expanded
								onedit={(id, change, debounce) => {
									if (data?.editable) notes.edit(data.round, id, change, debounce);
								}}
								onretry={(id) => notes.retry(data!.round, id)}
								onresolve={(id, choice) => notes.resolve(data!.round, id, choice)}
							/>
						{:else}<ArtifactClaimsView {data} entries={$notes} />{/if}
					{:else}<p class="hint">本輪進入討論後即可記錄；可切換回合查看先前筆記。</p>{/if}
				</div>
			</div>
		{:else if loading}<p role="status">載入座位與筆記中…</p>{/if}
	</div>
	{#if data}<SeatOrderDialog
			open={seatOpen}
			onclose={() => (seatOpen = false)}
			seatOrder={data.seatOrder}
			players={data.players}
			ownerPlayerId={data.ownerPlayerId}
		/>{/if}
</section>

<style>
	.discussion {
		color: #f5f1e8;
		margin: 0 0 1rem;
		min-width: 0;
	}
	.topline {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: center;
		margin-bottom: 12px;
	}
	h2 {
		font-size: 1.3rem;
		margin: 0;
	}
	button,
	select {
		min-height: 44px;
		border: 1px solid #79633c;
		border-radius: 8px;
		color: inherit;
		background: #24221e;
		padding: 8px 12px;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.seat-link {
		color: #dec18a;
		border: 0;
		background: transparent;
	}
	.round-select {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		color: #c8c1b4;
	}
	.discussion-layout,
	.reference {
		display: grid;
		gap: 12px;
		align-items: start;
	}
	.reference,
	.notebook {
		min-width: 0;
	}
	@media (min-width: 1024px) {
		.discussion-layout {
			grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
			gap: 24px;
		}
		.reference {
			position: sticky;
			top: 20px;
		}
		.round-select {
			justify-content: flex-end;
			gap: 12px;
		}
	}
	.view-tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		margin: 0 0 12px;
	}
	.view-tabs button {
		border-radius: 0;
	}
	.view-tabs button:first-child {
		border-radius: 8px 0 0 8px;
	}
	.view-tabs button:last-child {
		border-radius: 0 8px 8px 0;
	}
	.view-tabs .active {
		background: #c6a664;
		color: #1c1b19;
		font-weight: 600;
	}
	.privacy {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: space-between;
		color: #c8c1b4;
		font-size: 0.8rem;
		margin-bottom: 12px;
	}
	.privacy [role='status'] {
		color: #dec18a;
	}
	.sort {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-bottom: 12px;
		font-size: 0.875rem;
	}
	.chosen {
		border-color: #dec18a;
		color: #dec18a;
	}
	.hint {
		color: #c8c1b4;
		font-size: 0.875rem;
		line-height: 1.6;
		margin: 12px 0;
	}
	.error {
		display: flex;
		align-items: center;
		gap: 12px;
		color: #f3b6a9;
		margin: 12px 0;
	}
</style>
