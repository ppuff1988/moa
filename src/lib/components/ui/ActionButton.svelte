<script lang="ts">
	export let onClick: () => void;
	export let variant: 'create' | 'join' | 'primary' | 'destructive' = 'create';
	export let title: string;
	export let subtitle: string;
	export let disabled: boolean = false;
	export let size: 'default' | 'compact' = 'default';
</script>

<div class="button-container" class:compact={size === 'compact'}>
	<button
		on:click={onClick}
		class="action-btn {variant}-btn"
		class:compact={size === 'compact'}
		{disabled}
	>
		{title}
	</button>
	{#if subtitle}
		<p class="button-subtitle">{subtitle}</p>
	{/if}
</div>

<style>
	.button-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.button-container.compact {
		gap: 0;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.2rem 3rem;
		border: none;
		border-radius: calc(var(--radius) * 1.5);
		font-size: 1.3rem;
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
		min-width: 280px;
		box-shadow:
			0 8px 25px -5px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		position: relative;
		overflow: hidden;
	}

	.action-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s ease;
	}

	.action-btn:hover::before {
		left: 100%;
	}

	.action-btn.compact {
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		min-width: auto;
		border-radius: calc(var(--radius));
		box-shadow: none;
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none !important;
	}

	.action-btn:disabled::before {
		display: none;
	}

	:global(.create-btn) {
		background: linear-gradient(135deg, #c6a664, #d4b875);
		color: hsl(var(--card-foreground));
		border: 2px solid rgba(198, 166, 100, 0.5);
	}

	:global(.create-btn:hover:not(:disabled)) {
		transform: translateY(-3px);
		box-shadow:
			0 12px 35px -5px rgba(0, 0, 0, 0.4),
			0 0 20px rgba(212, 175, 55, 0.3);
		border-color: rgba(212, 175, 55, 0.8);
	}

	:global(.create-btn:active:not(:disabled)) {
		transform: translateY(-1px);
	}

	:global(.create-btn.compact:hover:not(:disabled)) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	:global(.join-btn) {
		background: linear-gradient(135deg, hsl(var(--primary)), #b91c1c);
		color: hsl(var(--primary-foreground));
		border: 2px solid rgba(220, 38, 38, 0.5);
	}

	:global(.join-btn:hover:not(:disabled)) {
		transform: translateY(-3px);
		box-shadow:
			0 12px 35px -5px rgba(165, 36, 34, 0.4),
			0 0 20px rgba(220, 38, 38, 0.3);
		border-color: rgba(220, 38, 38, 0.8);
	}

	:global(.join-btn:active:not(:disabled)) {
		transform: translateY(-1px);
	}

	:global(.join-btn.compact:hover:not(:disabled)) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(165, 36, 34, 0.3);
	}

	:global(.primary-btn) {
		background: linear-gradient(135deg, #c6a664, #d4b875);
		color: hsl(var(--card-foreground));
		border: 2px solid rgba(198, 166, 100, 0.5);
	}

	:global(.primary-btn:hover:not(:disabled)) {
		transform: translateY(-3px);
		box-shadow:
			0 12px 35px -5px rgba(0, 0, 0, 0.4),
			0 0 20px rgba(212, 175, 55, 0.3);
		border-color: rgba(212, 175, 55, 0.8);
	}

	:global(.primary-btn:active:not(:disabled)) {
		transform: translateY(-1px);
	}

	:global(.primary-btn.compact:hover:not(:disabled)) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	:global(.destructive-btn) {
		background: linear-gradient(135deg, hsl(var(--primary)), #b91c1c);
		color: hsl(var(--primary-foreground));
		border: 2px solid rgba(220, 38, 38, 0.5);
	}

	:global(.destructive-btn:hover:not(:disabled)) {
		transform: translateY(-3px);
		box-shadow:
			0 12px 35px -5px rgba(165, 36, 34, 0.4),
			0 0 20px rgba(220, 38, 38, 0.3);
		border-color: rgba(220, 38, 38, 0.8);
	}

	:global(.destructive-btn:active:not(:disabled)) {
		transform: translateY(-1px);
	}

	:global(.destructive-btn.compact:hover:not(:disabled)) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(165, 36, 34, 0.3);
	}

	.button-subtitle {
		color: hsl(var(--muted-foreground));
		font-size: 1rem;
		margin: 0;
		max-width: 280px;
		line-height: 1.6;
		text-align: center;
	}

	@media (max-width: 768px) {
		.action-btn {
			min-width: 250px;
			font-size: 1.2rem;
		}

		.action-btn.compact {
			min-width: auto;
			font-size: 0.875rem;
		}

		.button-subtitle {
			font-size: 0.9rem;
			max-width: 250px;
		}
	}
</style>
