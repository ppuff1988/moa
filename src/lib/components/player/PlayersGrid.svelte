<script lang="ts">
	import PlayerCard from './PlayerCard.svelte';
	import type { Player } from '$lib/types/game';

	export let players: Player[];
	export let currentUserId: number | undefined;
	export let isHost: boolean;
	export let gameStatus: string;
	export let roomName: string;
	export let onKickPlayer: ((userId: number) => void) | undefined;

	// 排序玩家列表：當前玩家排第一，其他玩家保持原順序
	$: sortedPlayers = [...players].sort((a, b) => {
		// 如果 a 是當前玩家，排在前面
		if (a.userId === currentUserId) return -1;
		// 如果 b 是當前玩家，排在前面
		if (b.userId === currentUserId) return 1;
		// 其他玩家保持原順序
		return 0;
	});
</script>

<div class="players-section" data-testid="players-section">
	<h2 class="section-title">房間玩家 ({players.length})</h2>

	<div class="players-grid" data-testid="players-grid">
		{#each sortedPlayers as player (player.userId)}
			<PlayerCard
				{player}
				isCurrentUser={player.userId === currentUserId}
				onKick={isHost && player.userId !== currentUserId && onKickPlayer
					? () => onKickPlayer(player.userId)
					: undefined}
				{gameStatus}
				{roomName}
				playerCount={players.length}
			/>
		{/each}
	</div>
</div>

<style>
	.players-section {
		margin-bottom: 3rem;
		width: 100%;
	}

	.section-title {
		color: hsl(var(--foreground));
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1.5rem;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.players-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	@media (max-width: 768px) {
		.players-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
