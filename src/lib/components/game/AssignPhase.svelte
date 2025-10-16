<script lang="ts">
	import type { Player } from '$lib/types/game';

	export let players: Player[];
	export let assignablePlayers: Player[];
	export let onAssign: (playerId: number | string) => void;
	export let onEnterDiscussion: () => void;
</script>

<div class="assign-phase">
	{#if players.length === 0}
		<div class="loading-skills">
			<div class="loading-spinner-small"></div>
			<p>載入玩家列表中...</p>
		</div>
	{:else if assignablePlayers.length === 0}
		<div class="no-assignable-section">
			<div class="no-assignable-message">
				<div class="warning-icon">⚠️</div>
				<p class="no-assignable-text">沒有可以指派的玩家</p>
				<p class="no-assignable-subtext">（所有玩家都已行動）</p>
			</div>
			<button class="primary-btn enter-discussion-btn" on:click={onEnterDiscussion}>
				進入討論階段
			</button>
		</div>
	{:else}
		<div class="skills-header">
			<h4 class="action-subtitle">指派下一位玩家</h4>
			<p class="skills-description">選擇還未行動過的玩家作為下一位行動者</p>
		</div>
		<div class="player-list-inline">
			{#each assignablePlayers as player (player.id)}
				<button class="player-btn-inline" on:click={() => onAssign(player.id)}>
					<div class="player-dot" style:background-color={player.colorCode || '#888'}></div>
					<span>{player.nickname}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.assign-phase {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.skills-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.action-subtitle {
		color: hsl(var(--foreground));
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		margin: 0;
	}

	.skills-description {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		text-align: center;
	}

	.player-list-inline {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: center;
		padding: 0.5rem 0;
	}

	.player-btn-inline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		color: hsl(var(--foreground));
		font-weight: 500;
		cursor: pointer;
		transition: var(--transition-elegant);
	}

	.player-btn-inline:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(212, 175, 55, 0.5);
		transform: translateY(-2px);
	}

	.player-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.loading-skills {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
	}

	.loading-spinner-small {
		width: 2rem;
		height: 2rem;
		border: 2px solid hsl(var(--muted));
		border-top: 2px solid hsl(var(--primary));
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.no-assignable-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
	}

	.no-assignable-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.warning-icon {
		font-size: 3rem;
	}

	.no-assignable-text {
		font-size: 1.125rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		margin: 0;
	}

	.no-assignable-subtext {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.primary-btn {
		padding: 0.75rem 1.5rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		border: none;
		border-radius: calc(var(--radius));
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
	}

	.primary-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
	}

	.enter-discussion-btn {
		font-size: 1rem;
	}
</style>
