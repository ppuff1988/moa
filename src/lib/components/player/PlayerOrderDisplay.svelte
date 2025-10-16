<script lang="ts">
	interface ActionedPlayer {
		id: number;
		nickname: string;
		color: string;
		colorCode: string;
		roleName?: string | null;
	}

	interface Props {
		currentRound: number;
		actionedPlayers: ActionedPlayer[];
		currentActionPlayer: ActionedPlayer | null;
	}

	let { currentRound, actionedPlayers, currentActionPlayer }: Props = $props();

	// 羅馬數字轉換
	function romanNumeral(num: number): string {
		const romanNumerals: [number, string][] = [
			[1000, 'M'],
			[900, 'CM'],
			[500, 'D'],
			[400, 'CD'],
			[100, 'C'],
			[90, 'XC'],
			[50, 'L'],
			[40, 'XL'],
			[10, 'X'],
			[9, 'IX'],
			[5, 'V'],
			[4, 'IV'],
			[1, 'I']
		];

		let result = '';
		let n = num;

		for (const [value, numeral] of romanNumerals) {
			while (n >= value) {
				result += numeral;
				n -= value;
			}
		}

		return result;
	}
</script>

<div class="turn-order-section">
	<div class="turn-order-header">
		<h2 class="turn-order-title">
			第{romanNumeral(currentRound)}回合
		</h2>
	</div>
	<div class="turn-order-content">
		{#if actionedPlayers.length === 0 && !currentActionPlayer}
			<p class="no-actions-yet">尚未有玩家行動</p>
		{:else}
			{#each actionedPlayers.filter((p) => !currentActionPlayer || p.id !== currentActionPlayer.id) as player, index (player.id)}
				<div class="turn-order-player acted">
					<div class="player-color-dot" style:background-color={player.colorCode || '#888'}></div>
					<span class="player-name">{player.nickname}</span>
				</div>

				<!-- Only show arrow if not the last player OR if there's a current action player -->
				{#if index < actionedPlayers.filter((p) => !currentActionPlayer || p.id !== currentActionPlayer.id).length - 1 || currentActionPlayer}
					<span class="arrow">→</span>
				{/if}
			{/each}

			{#if currentActionPlayer}
				<div class="turn-order-player acting">
					<div
						class="player-color-dot"
						style:background-color={currentActionPlayer.colorCode || '#888'}
					></div>
					<span class="player-name">{currentActionPlayer.nickname}</span>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	/* 回合順序區域 */
	.turn-order-section {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		backdrop-filter: blur(10px);
	}

	.turn-order-header {
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.turn-order-title {
		color: hsl(var(--foreground));
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
		letter-spacing: 0.05em;
	}

	.turn-order-content {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 1rem;
		font-size: 1.125rem;
	}

	.no-actions-yet {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		padding: 1rem;
		margin: 0;
	}

	.turn-order-player {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		transition: all 0.3s ease;
		position: relative;
	}

	.turn-order-player.acted {
		background: rgba(148, 163, 184, 0.15);
		border: 1px solid rgba(148, 163, 184, 0.3);
	}

	.turn-order-player.acting {
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

	.turn-order-player:hover {
		transform: translateY(-2px);
	}

	/* 玩家顏色指示器 */
	.player-color-dot {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 2px solid rgba(255, 255, 255, 0.4);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.player-name {
		font-weight: 600;
		font-size: 1.125rem;
		color: hsl(var(--foreground));
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.arrow {
		color: hsl(var(--muted-foreground));
		font-size: 1.5rem;
		font-weight: 300;
		opacity: 0.6;
	}
</style>
