<script lang="ts">
	export let roomName: string;
	export let gameStatus: string;
	export let playerCount: number;
	export let maxPlayers: number;
	export let minPlayers: number;
	export let isHost: boolean;
	export let allPlayersReady: boolean;
	export let onLeaveRoom: () => void;
	export let onStartSelection: () => void;
	export let onStartGame: () => void;
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
		{/if}
	</div>

	<div class="header-actions">
		{#if gameStatus === 'waiting'}
			<button class="leave-btn" on:click={onLeaveRoom}>離開房間</button>
		{/if}

		{#if isHost}
			{#if gameStatus === 'waiting'}
				<button class="start-btn" on:click={onStartSelection} disabled={playerCount < minPlayers}>
					選擇角色
				</button>
			{:else if gameStatus === 'selecting'}
				<button class="start-btn" on:click={onStartGame} disabled={!allPlayersReady}>
					開始遊戲
				</button>
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
	}

	.leave-btn,
	.start-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: calc(var(--radius));
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
	}

	.leave-btn {
		background: hsl(var(--destructive));
		color: hsl(var(--destructive-foreground));
	}

	.leave-btn:hover {
		background: hsl(var(--destructive) / 0.9);
		transform: translateY(-1px);
	}

	.start-btn {
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
	}

	.start-btn:hover:not(:disabled) {
		background: hsl(var(--secondary) / 0.9);
		transform: translateY(-1px);
	}

	.start-btn:disabled {
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		cursor: not-allowed;
		opacity: 0.5;
	}

	@media (max-width: 768px) {
		.room-header {
			flex-direction: column;
			gap: 1rem;
		}

		.header-actions {
			justify-content: center;
		}
	}
</style>
