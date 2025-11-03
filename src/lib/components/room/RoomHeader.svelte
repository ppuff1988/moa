<script lang="ts">
	import HeaderActions from '$lib/components/shared/HeaderActions.svelte';
	import type { Player } from '$lib/types/game';

	export let roomName: string;
	export let gameStatus: string;
	export let playerCount: number;
	export let maxPlayers: number;
	export let minPlayers: number;
	export let isHost: boolean;
	export let allPlayersReady: boolean;
	export let players: Player[] = [];
	export let onStartSelection: () => void;
	export let onStartGame: () => void;

	$: readyCount = players.filter((p) => p.isReady).length;
	$: readyCountText = `已選擇人數 ${readyCount}/${playerCount}`;
</script>

<div class="room-header" data-testid="room-info">
	<div class="room-info">
		<h1 class="room-title" data-testid="room-title">房間：{roomName}</h1>
		{#if gameStatus === 'waiting'}
			<p class="room-subtitle">
				房間玩家 {playerCount}/{maxPlayers} 人
				{#if playerCount < minPlayers}
					（還需要 {minPlayers - playerCount} 人才能開始遊戲）
				{:else}
					（已滿足開始條件）
				{/if}
			</p>
		{:else if gameStatus === 'selecting'}
			<p class="room-subtitle">
				{readyCountText}
			</p>
		{/if}
	</div>

	<HeaderActions
		{roomName}
		{gameStatus}
		{playerCount}
		{minPlayers}
		{isHost}
		{allPlayersReady}
		{onStartSelection}
		{onStartGame}
	/>
</div>

<style>
	.room-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		padding: 1.5rem;
		backdrop-filter: blur(10px);
		width: 100%;
	}

	.room-title {
		color: hsl(var(--foreground));
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.room-subtitle {
		color: hsl(var(--muted-foreground));
		margin: 0.5rem 0 0 0;
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.room-header {
			flex-direction: column;
			gap: 1rem;
		}
	}
</style>
