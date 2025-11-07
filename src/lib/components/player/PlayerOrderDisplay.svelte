<script lang="ts">
	interface ActionedPlayer {
		id: number;
		nickname: string;
		color: string;
		colorCode: string;
		roleName?: string | null;
	}

	interface Props {
		currentActionPlayer: ActionedPlayer | null;
		actionedPlayers?: ActionedPlayer[];
	}

	let { currentActionPlayer, actionedPlayers = [] }: Props = $props();

	let isExpanded = $state(false);
</script>

<div class="turn-order-section">
	<div class="turn-info">
		<div class="round-display">目前玩家</div>
		{#if currentActionPlayer}
			<div class="current-player">
				<div
					class="player-color-dot"
					style:background-color={currentActionPlayer.colorCode || '#888'}
				></div>
				<span class="player-name">{currentActionPlayer.nickname}</span>
			</div>
		{:else}
			<div class="waiting-text">等待中...</div>
		{/if}

		{#if actionedPlayers.length > 0}
			<button
				class="toggle-btn"
				onclick={() => (isExpanded = !isExpanded)}
				aria-label={isExpanded ? '收起順序' : '展開順序'}
			>
				{isExpanded ? '▲' : '▼'}
			</button>
		{/if}
	</div>

	{#if isExpanded && actionedPlayers.length > 0}
		<div class="player-order-list">
			<div class="order-title">行動順序</div>
			<div class="order-items">
				{#each actionedPlayers as player (player.id)}
					<div class="order-item">
						<span class="order-number">{actionedPlayers.indexOf(player) + 1}.</span>
						<div
							class="player-color-dot small"
							style:background-color={player.colorCode || '#888'}
						></div>
						<span class="order-player-name">{player.nickname}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.turn-order-section {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		backdrop-filter: blur(10px);
	}

	.turn-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.round-display {
		color: hsl(var(--foreground));
		font-size: 1.25rem;
		font-weight: 700;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
		letter-spacing: 0.05em;
	}

	.current-player {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.3));
		border: 2px solid rgba(212, 175, 55, 0.6);
		box-shadow:
			0 0 20px rgba(212, 175, 55, 0.4),
			0 4px 12px rgba(0, 0, 0, 0.3);
		animation: glow-pulse 2s ease-in-out infinite;
	}

	@keyframes glow-pulse {
		0%,
		100% {
			box-shadow:
				0 0 20px rgba(212, 175, 55, 0.4),
				0 4px 12px rgba(0, 0, 0, 0.3);
		}
		50% {
			box-shadow:
				0 0 30px rgba(212, 175, 55, 0.6),
				0 6px 16px rgba(0, 0, 0, 0.4);
		}
	}

	.player-color-dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 2px solid rgba(255, 255, 255, 0.4);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.player-color-dot.small {
		width: 10px;
		height: 10px;
		border-width: 1px;
	}

	.player-name {
		font-weight: 600;
		font-size: 1rem;
		color: hsl(var(--foreground));
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.waiting-text {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		font-size: 1rem;
	}

	.toggle-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 6px;
		padding: 0.4rem 0.75rem;
		color: hsl(var(--foreground));
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		backdrop-filter: blur(5px);
	}

	.toggle-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(212, 175, 55, 0.5);
		transform: translateY(-1px);
	}

	.toggle-btn:active {
		transform: translateY(0);
	}

	.player-order-list {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		animation: slideDown 0.3s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.order-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		margin-bottom: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.order-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.order-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		transition: background 0.2s ease;
	}

	.order-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.order-number {
		font-size: 0.875rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		min-width: 1.5rem;
	}

	.order-player-name {
		font-size: 0.875rem;
		color: hsl(var(--foreground));
		font-weight: 500;
	}

	/* 手機版調整 */
	@media (max-width: 640px) {
		.turn-order-section {
			padding: 0.75rem;
			margin-bottom: 0.75rem;
		}

		.turn-info {
			gap: 0.75rem;
		}

		.round-display {
			font-size: 1.125rem;
		}

		.current-player {
			padding: 0.375rem 0.75rem;
			gap: 0.5rem;
		}

		.player-color-dot {
			width: 12px;
			height: 12px;
		}

		.player-color-dot.small {
			width: 9px;
			height: 9px;
		}

		.player-name {
			font-size: 0.875rem;
		}

		.waiting-text {
			font-size: 0.875rem;
		}

		.toggle-btn {
			padding: 0.35rem 0.6rem;
			font-size: 0.75rem;
		}

		.order-title {
			font-size: 0.75rem;
			margin-bottom: 0.5rem;
		}

		.order-item {
			padding: 0.25rem 0.375rem;
			gap: 0.375rem;
		}

		.order-number {
			font-size: 0.75rem;
			min-width: 1.25rem;
		}

		.order-player-name {
			font-size: 0.75rem;
		}
	}
</style>
