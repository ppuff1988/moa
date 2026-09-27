<script lang="ts">
	import { onMount } from 'svelte';
	import { discussionRequest } from '$lib/services/discussionService';
	import type { SeatingMode } from '$lib/types/discussion';
	let {
		roomName,
		currentUserId,
		isHost,
		onready
	}: {
		roomName: string;
		currentUserId?: number;
		isHost: boolean;
		onready?: (ready: boolean) => void;
	} = $props();
	type Seats = {
		seatingMode: SeatingMode;
		seatOrder: number[] | null;
		editable: boolean;
		players: Array<{ id: number; userId: number; nickname: string; isHost: boolean }>;
	};
	let data = $state<Seats | null>(null);
	let order: number[] = $state([]);
	let dirty = $state(false);
	let saving = $state(false);
	let message = $state('');
	let stopped = false;
	let sequence = 0;
	const name = (id: number) => data?.players.find((p) => p.id === id)?.nickname ?? '玩家';
	const myId = $derived(data?.players.find((p) => p.userId === currentUserId)?.id);
	const myIndex = $derived(data?.seatOrder?.indexOf(myId ?? -1) ?? -1);
	$effect(() => {
		onready?.(!!data && !saving && !dirty && (data.seatingMode === 'random' || !!data.seatOrder));
	});
	async function refresh() {
		const request = ++sequence;
		try {
			const next = await discussionRequest<Seats>(roomName, 'seating');
			if (stopped || request !== sequence) return;
			const changedRoster =
				data && data.players.map((p) => p.id).join() !== next.players.map((p) => p.id).join();
			if (!dirty || changedRoster) {
				order =
					next.seatOrder ??
					[...next.players].sort((a, b) => Number(b.isHost) - Number(a.isHost)).map((p) => p.id);
				dirty = false;
			}
			data = next;
			if (changedRoster) message = '玩家名單已變動，請重新確認座位';
		} catch (err) {
			if (!stopped) message = err instanceof Error ? err.message : '座位載入失敗';
		}
	}
	function move(index: number, direction: number) {
		const next = [...order];
		[next[index], next[index + direction]] = [next[index + direction], next[index]];
		order = next;
		dirty = true;
		message = '';
	}
	async function save() {
		saving = true;
		++sequence;
		try {
			await discussionRequest(roomName, 'seating', { seatOrder: order });
			dirty = false;
			message = '座位已儲存，請大家核對左右鄰居';
			await refresh();
		} catch (err) {
			message = err instanceof Error ? err.message : '儲存失敗';
		} finally {
			saving = false;
		}
	}
	onMount(() => {
		void refresh();
		const timer = setInterval(() => {
			if (!saving) void refresh();
		}, 5000);
		return () => {
			stopped = true;
			clearInterval(timer);
		};
	});
</script>

<section class="seating" aria-label="座位安排">
	<h2>座位安排</h2>
	{#if data?.seatingMode === 'random'}
		<p>隨機座位・開局時抽出一圈座位，三輪固定。</p>
	{:else if data}
		<p>依現場座位・從房主開始，依左手邊的方向排一圈，最後回到第一位。</p>
		{#if isHost && data.editable}
			<ol>
				{#each order as id, index (id)}<li>
						<span>{index + 1}. {name(id)}</span>
						<button
							type="button"
							aria-label={`將${name(id)}往前移`}
							disabled={index === 0 || saving}
							onclick={() => move(index, -1)}>↑</button
						>
						<button
							type="button"
							aria-label={`將${name(id)}往後移`}
							disabled={index === order.length - 1 || saving}
							onclick={() => move(index, 1)}>↓</button
						>
					</li>{/each}
			</ol>
			<button type="button" class="save" disabled={saving || order.length < 2} onclick={save}
				>{saving ? '儲存中…' : '確認現場座位'}</button
			>
			{#if dirty}<p>有尚未儲存的調整</p>{/if}
		{:else if data.seatOrder}
			<p>{data.seatOrder.map(name).join(' → ')} → 回到第一位</p>
		{:else}<p>等待房主依現場位置確認座位。</p>{/if}
		{#if data.seatOrder && myIndex >= 0}
			<p class="neighbours">
				你的左邊：<strong>{name(data.seatOrder[(myIndex + 1) % data.seatOrder.length])}</strong><br
				/>
				你的右邊：<strong
					>{name(
						data.seatOrder[(myIndex - 1 + data.seatOrder.length) % data.seatOrder.length]
					)}</strong
				>
			</p>
		{/if}
	{/if}
	{#if message}<p role="status">{message}</p>{/if}
</section>

<style>
	.seating {
		padding: 1rem;
		margin-bottom: 1rem;
		border: 1px solid #79633c;
		border-radius: 12px;
		background: #24221ee6;
		color: #f5f1e8;
	}
	h2 {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
		color: #c6a664;
	}
	p {
		line-height: 1.6;
		margin: 0.5rem 0;
		overflow-wrap: anywhere;
	}
	ol {
		list-style: none;
		margin: 1rem 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	li {
		display: flex;
		gap: 8px;
		align-items: center;
		border-bottom: 1px solid #ffffff18;
		padding-bottom: 8px;
	}
	li span {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	button {
		min-width: 44px;
		min-height: 44px;
		border: 1px solid #79633c;
		border-radius: 8px;
		background: transparent;
		color: #f5f1e8;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.save {
		background: #c6a664;
		color: #1c1b19;
		padding: 0.5rem 1rem;
	}
	.neighbours {
		border-top: 1px solid #79633c;
		padding-top: 0.75rem;
	}
</style>
