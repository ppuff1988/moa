<script lang="ts">
	import ActionButton from '$lib/components/ui/ActionButton.svelte';
	import type { Player } from '$lib/types/game';

	export let roomName: string;
	export let gameStatus: string;
	export let playerCount: number;
	export let maxPlayers: number;
	export let minPlayers: number;
	export let isHost: boolean;
	export let allPlayersReady: boolean;
	export let players: Player[] = [];
	export let onLeaveRoom: () => void;
	export let onStartSelection: () => void;
	export let onStartGame: () => void;

	// 計算已選擇角色的玩家數量
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

	<div class="header-actions">
		{#if gameStatus === 'waiting'}
			<ActionButton variant="destructive" title="離開房間" subtitle="" onClick={onLeaveRoom} />
		{/if}

		{#if isHost}
			{#if gameStatus === 'waiting'}
				<ActionButton
					variant="primary"
					title="選擇角色"
					subtitle=""
					disabled={playerCount < minPlayers}
					onClick={onStartSelection}
				/>
			{:else if gameStatus === 'selecting'}
				<ActionButton
					variant="primary"
					title="開始遊戲"
					subtitle=""
					disabled={!allPlayersReady}
					onClick={onStartGame}
				/>
			{/if}
		{/if}
	</div>
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
		font-size: 2rem;
		font-weight: 600;
		margin: 0;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.room-subtitle {
		color: hsl(var(--muted-foreground));
		margin: 0.5rem 0 0 0;
		font-size: 1rem;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.header-actions :global(.button-container) {
		gap: 0.5rem;
	}

	.header-actions :global(.action-btn) {
		padding: 0.75rem 1.5rem;
		min-width: 140px;
		font-size: 1rem;
	}

	.header-actions :global(.button-subtitle) {
		font-size: 0.75rem;
		max-width: 140px;
	}

	@media (max-width: 768px) {
		.room-header {
			flex-direction: column;
			gap: 1rem;
		}

		.header-actions {
			justify-content: flex-start;
			width: 100%;
		}

		.header-actions :global(.action-btn) {
			min-width: 120px;
		}

		.header-actions :global(.button-subtitle) {
			max-width: 120px;
		}
	}
</style>
