<script lang="ts">
	import DiscussionDialog from './DiscussionDialog.svelte';
	import type { DiscussionPlayer } from '$lib/types/discussion';
	let {
		open,
		onclose,
		seatOrder,
		players,
		ownerPlayerId
	}: {
		open: boolean;
		onclose: () => void;
		seatOrder: number[] | null;
		players: DiscussionPlayer[];
		ownerPlayerId: number;
	} = $props();
	const myIndex = $derived(seatOrder?.indexOf(ownerPlayerId) ?? -1);
	const name = (id: number) => players.find((p) => p.playerId === id)?.nickname ?? '玩家';
</script>

<DiscussionDialog {open} {onclose} title="固定座位">
	{#if seatOrder}
		<p>沿箭頭往左鄰，最後接回 1 號。三輪座位固定。</p>
		<ol class="circle" aria-label="依左鄰方向的固定座位">
			{#each seatOrder as id, index (id)}
				<li
					class:self={id === ownerPlayerId}
					style:left={`${50 + 35 * Math.sin((index / seatOrder.length) * 2 * Math.PI)}%`}
					style:top={`${50 - 36 * Math.cos((index / seatOrder.length) * 2 * Math.PI)}%`}
				>
					<span>{index + 1} 號 → {((index + 1) % seatOrder.length) + 1} 號</span>
					<strong title={name(id)}>{name(id)}{id === ownerPlayerId ? '（你）' : ''}</strong>
				</li>
			{/each}
		</ol>
		{#if myIndex >= 0}<p>
				你的左邊：<strong>{name(seatOrder[(myIndex + 1) % seatOrder.length])}</strong><br />
				你的右邊：<strong
					>{name(seatOrder[(myIndex + seatOrder.length - 1) % seatOrder.length])}</strong
				>
			</p>{/if}
	{:else}<p>此局未建立座位，可依行動順序查看筆記。</p>{/if}
</DiscussionDialog>

<style>
	p {
		line-height: 1.7;
	}
	.circle {
		position: relative;
		height: 350px;
		max-width: 420px;
		margin: 1rem auto;
		padding: 0;
		list-style: none;
	}
	.circle::before {
		content: '';
		position: absolute;
		inset: 17%;
		border: 1px dashed #79633c;
		border-radius: 50%;
	}
	li {
		position: absolute;
		width: 24%;
		transform: translate(-50%, -50%);
		text-align: center;
		background: #2c2923;
		border: 1px solid #79633c;
		border-radius: 8px;
		padding: 6px 3px;
		overflow-wrap: anywhere;
	}
	li span {
		display: block;
		font-size: 0.75rem;
		color: #c6a664;
	}
	li strong {
		font-size: 0.875rem;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	li.self {
		border-color: #e4cc97;
		background: #463a27;
	}
</style>
