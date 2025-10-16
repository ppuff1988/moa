<script lang="ts">
	import type { SkillActions } from '$lib/types/game';

	export let skillActions: SkillActions | null;
	export let usedSkills: { checkArtifact: number };
	export let onIdentify: (beastId: number) => void;
	export let onSkipToSkill: () => void;

	$: canIdentify = skillActions && skillActions.checkArtifact > 0;
	$: hasUsedAll = skillActions && usedSkills.checkArtifact >= skillActions.checkArtifact;

	// Suppress unused warnings - these are callback props used by parent component
	$: {
		void onIdentify;
		void onSkipToSkill;
	}
</script>

<div class="identification-phase">
	{#if canIdentify}
		<p class="phase-hint">請點擊一個獸首進行鑑定</p>
		{#if !hasUsedAll && skillActions}
			<p class="remaining-count">
				剩餘次數：{skillActions.checkArtifact - usedSkills.checkArtifact}
			</p>
		{/if}
	{:else}
		<p class="phase-hint">你的角色無法鑑定獸首</p>
		<button class="primary-btn" on:click={onSkipToSkill}> 跳過鑑定，進入技能階段 </button>
	{/if}
</div>

<style>
	.identification-phase {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.phase-hint {
		color: hsl(var(--muted-foreground));
		text-align: center;
		font-size: 1rem;
		margin: 0;
	}

	.remaining-count {
		color: #22c55e;
		font-weight: 600;
		font-size: 0.875rem;
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
</style>
