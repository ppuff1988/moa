<script lang="ts">
	import type { SkillActions } from '$lib/types/game';

	export let skillActions: SkillActions | null;
	export let usedSkills: { checkArtifact: number };
	export let onIdentify: (beastId: number) => void;
	export let onSkipToSkill: () => void;

	$: canIdentify = skillActions && skillActions.checkArtifact > 0;
	$: hasUsedAll = skillActions && usedSkills.checkArtifact >= skillActions.checkArtifact;
	$: remainingCount = skillActions ? skillActions.checkArtifact - usedSkills.checkArtifact : 0;

	// Suppress unused warnings - these are callback props used by parent component
	$: {
		void onIdentify;
		void onSkipToSkill;
	}
</script>

<div class="identification-phase">
	{#if canIdentify}
		<div class="phase-content">
			<div class="phase-icon">🔍</div>
			<p class="phase-hint">點擊上方的獸首進行鑑定</p>
			{#if !hasUsedAll && skillActions}
				<div class="remaining-badge">
					<span class="badge-label">剩餘鑑定次數</span>
					<span class="badge-count">{remainingCount}</span>
				</div>
			{:else}
				<div class="completed-badge">
					<span>✓</span>
					<span>已用完所有鑑定次數</span>
				</div>
			{/if}
		</div>
	{:else}
		<div class="no-skill-content">
			<div class="no-skill-icon">⊘</div>
			<p class="no-skill-text">你的角色無法鑑定獸首</p>
			<p class="no-skill-subtext">可直接進入技能階段使用其他能力</p>
			<button class="skip-btn" on:click={onSkipToSkill}>
				<span>跳過鑑定</span>
				<span class="arrow">→</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.identification-phase {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
	}

	.phase-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: calc(var(--radius));
		width: 100%;
		max-width: 500px;
	}

	.phase-icon {
		font-size: 3rem;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.8;
		}
	}

	.phase-hint {
		color: hsl(var(--foreground));
		text-align: center;
		font-size: 1rem;
		font-weight: 500;
		margin: 0;
	}

	.remaining-badge {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		background: rgba(34, 197, 94, 0.15);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: calc(var(--radius));
	}

	.badge-label {
		color: #22c55e;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.badge-count {
		color: #22c55e;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.completed-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: rgba(100, 100, 100, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		font-weight: 500;
	}

	/* 無技能狀態 */
	.no-skill-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: calc(var(--radius));
		width: 100%;
		max-width: 500px;
	}

	.no-skill-icon {
		font-size: 3rem;
		color: hsl(var(--muted-foreground));
		opacity: 0.5;
	}

	.no-skill-text {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		text-align: center;
	}

	.no-skill-subtext {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		margin: 0;
		text-align: center;
	}

	.skip-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1.75rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		border: none;
		border-radius: calc(var(--radius));
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
	}

	.skip-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(212, 175, 55, 0.5);
	}

	.skip-btn:active {
		transform: translateY(0);
	}

	.arrow {
		font-size: 1.25rem;
		transition: transform 0.2s ease;
	}

	.skip-btn:hover .arrow {
		transform: translateX(3px);
	}

	/* 響應式設計 */
	@media (max-width: 768px) {
		.phase-content,
		.no-skill-content {
			padding: 1.25rem;
		}

		.phase-icon,
		.no-skill-icon {
			font-size: 2.5rem;
		}

		.phase-hint {
			font-size: 0.9375rem;
		}

		.no-skill-text {
			font-size: 1rem;
		}
	}
</style>
