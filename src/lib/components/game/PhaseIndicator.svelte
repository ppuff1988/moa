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
				return '階段三：指派玩家';
			default:
				return '';
		}
	}

	$: currentPhaseTitle = getPhaseTitle(gamePhase);
	$: phaseNumber = gamePhase === 'identification' ? 1 : gamePhase === 'skill' ? 2 : 3;
</script>

{#if isMyTurn}
	<div class="phase-indicator">
		<div class="phase-header">
			<div class="phase-title">{currentPhaseTitle}</div>
		</div>
		<div class="phase-steps">
			<div
				class="step"
				class:active={gamePhase === 'identification'}
				class:completed={phaseNumber > 1}
			>
				<span class="step-label">鑑定</span>
			</div>
			<div class="step-arrow" class:active={phaseNumber >= 2}>→</div>
			<div class="step" class:active={gamePhase === 'skill'} class:completed={phaseNumber > 2}>
				<span class="step-label">技能</span>
			</div>
			<div class="step-arrow" class:active={phaseNumber >= 3}>→</div>
			<div class="step" class:active={gamePhase === 'assign-next'}>
				<span class="step-label">指派</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.phase-indicator {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05));
		border: 2px solid rgba(212, 175, 55, 0.3);
		border-radius: calc(var(--radius) + 2px);
		padding: 1.25rem 1.5rem;
		backdrop-filter: blur(10px);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
	}

	.phase-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.phase-number {
		color: #f4e285;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.phase-title {
		color: hsl(var(--foreground));
		font-size: 1.25rem;
		font-weight: 700;
		text-align: center;
		margin: 0;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.phase-steps {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
		transition: all 0.3s ease;
		position: relative;
		min-width: 70px;
	}

	.step-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.2);
		font-weight: 700;
		font-size: 0.875rem;
		transition: all 0.3s ease;
	}

	.step-label {
		font-size: 0.8125rem;
		transition: all 0.3s ease;
	}

	.step.completed {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.4);
		color: #22c55e;
	}

	.step.completed .step-number {
		background: rgba(34, 197, 94, 0.2);
		border-color: rgba(34, 197, 94, 0.5);
		color: #22c55e;
	}

	.step.completed::after {
		content: '✓';
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		font-size: 0.75rem;
		color: #22c55e;
	}

	.step.active {
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		border-color: rgba(212, 175, 55, 0.6);
		box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
		animation: activeGlow 2s ease-in-out infinite;
	}

	.step.active .step-number {
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
		color: hsl(var(--secondary-foreground));
	}

	@keyframes activeGlow {
		0%,
		100% {
			box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
		}
		50% {
			box-shadow: 0 0 25px rgba(212, 175, 55, 0.6);
		}
	}

	.step-arrow {
		color: hsl(var(--muted-foreground));
		font-size: 1.5rem;
		opacity: 0.4;
		transition: all 0.3s ease;
	}

	.step-arrow.active {
		opacity: 1;
		color: #d4af37;
	}

	@media (max-width: 768px) {
		.phase-indicator {
			padding: 1rem;
		}

		.phase-header {
			margin-bottom: 0.75rem;
		}

		.phase-number {
			font-size: 0.75rem;
		}

		.phase-title {
			font-size: 1rem;
		}

		.phase-steps {
			gap: 0.5rem;
		}

		.step {
			padding: 0.5rem 0.75rem;
			min-width: 60px;
		}

		.step-number {
			width: 24px;
			height: 24px;
			font-size: 0.8125rem;
		}

		.step-label {
			font-size: 0.75rem;
		}

		.step-arrow {
			font-size: 1.25rem;
		}
	}
</style>
