<script lang="ts">
	export let message: string;
	export let action: string;
	export let onAction: () => void;
	export let variant: 'info' | 'success' | 'warning' = 'info';
</script>

<div
	class="quick-action-hint"
	class:variant-info={variant === 'info'}
	class:variant-success={variant === 'success'}
	class:variant-warning={variant === 'warning'}
>
	<div class="hint-content">
		<span class="hint-icon">
			{#if variant === 'success'}
				✓
			{:else if variant === 'warning'}
				⚠️
			{:else}
				💡
			{/if}
		</span>
		<span class="hint-message">{message}</span>
	</div>
	<button class="quick-action-btn" on:click={onAction}>
		<span>{action}</span>
		<span class="arrow">→</span>
	</button>
</div>

<style>
	.quick-action-hint {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: calc(var(--radius));
		backdrop-filter: blur(5px);
		animation: slideIn 0.3s ease;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.variant-info {
		background: rgba(59, 130, 246, 0.15);
		border: 1px solid rgba(59, 130, 246, 0.3);
	}

	.variant-success {
		background: rgba(34, 197, 94, 0.15);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.variant-warning {
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.hint-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.hint-icon {
		font-size: 1.5rem;
	}

	.variant-info .hint-icon {
		color: #3b82f6;
	}

	.variant-success .hint-icon {
		color: #22c55e;
	}

	.variant-warning .hint-icon {
		color: #f59e0b;
	}

	.hint-message {
		color: hsl(var(--foreground));
		font-size: 0.9375rem;
		font-weight: 500;
	}

	.quick-action-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		border: none;
		border-radius: calc(var(--radius) - 2px);
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.quick-action-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
	}

	.quick-action-btn:active {
		transform: translateY(0);
	}

	.arrow {
		font-size: 1.125rem;
		transition: transform 0.2s ease;
	}

	.quick-action-btn:hover .arrow {
		transform: translateX(3px);
	}

	@media (max-width: 768px) {
		.quick-action-hint {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
			padding: 1rem;
		}

		.hint-content {
			justify-content: center;
		}

		.hint-message {
			font-size: 0.875rem;
		}

		.quick-action-btn {
			justify-content: center;
		}
	}
</style>
