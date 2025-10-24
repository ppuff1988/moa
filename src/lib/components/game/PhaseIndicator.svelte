<script lang="ts">
	import type { GamePhase } from '$lib/types/game';

	export let isMyTurn: boolean;
	export let gamePhase: GamePhase;

	function getPhaseTitle(phase: GamePhase): string {
		switch (phase) {
			case 'identification':
				return '階段一：鑑定獸首';
			case 'skill':
				return '階段二：使用技能';
			case 'assign-next':
				return '階段三：指派下一位玩家';
			default:
				return '';
		}
	}

	$: currentPhaseTitle = getPhaseTitle(gamePhase);
</script>

{#if isMyTurn}
	<div class="phase-indicator">
		<div class="phase-title">{currentPhaseTitle}</div>
		<div class="phase-steps">
			<div class="step" class:active={gamePhase === 'identification'}>1. 鑑定</div>
			<div class="step-arrow">→</div>
			<div class="step" class:active={gamePhase === 'skill'}>2. 技能</div>
			<div class="step-arrow">→</div>
			<div class="step" class:active={gamePhase === 'assign-next'}>3. 指派</div>
		</div>
	</div>
{/if}

<style>
	.phase-indicator {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		padding: 1rem 1.5rem;
		backdrop-filter: blur(10px);
	}

	.phase-title {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		text-align: center;
	}

	.phase-steps {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.step {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius) - 2px);
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.step.active {
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		border-color: rgba(212, 175, 55, 0.5);
	}

	.step-arrow {
		color: hsl(var(--muted-foreground));
		font-size: 1.25rem;
	}

	@media (max-width: 768px) {
		.phase-indicator {
			padding: 0.75rem 1rem;
		}

		.phase-title {
			font-size: 1rem;
			margin-bottom: 0.5rem;
		}

		.phase-steps {
			gap: 0.25rem;
		}

		.step {
			font-size: 1rem;
			padding: 0.4rem 0.6rem;
		}

		.step-arrow {
			font-size: 1rem;
		}
	}
</style>
