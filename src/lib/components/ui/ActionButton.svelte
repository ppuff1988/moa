<script lang="ts">
	export let onClick: () => void;
	export let variant: 'create' | 'join' | 'primary' | 'destructive' = 'create';
	export let title: string;
	export let subtitle: string;
	export let disabled: boolean = false;
</script>

<div class="button-container">
	<button on:click={onClick} class="action-btn {variant}-btn" {disabled}>
		{title}
	</button>
	<p class="button-subtitle">{subtitle}</p>
</div>

<style>
	.button-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.action-btn {
		padding: 1.2rem 3rem;
		border: none;
		border-radius: calc(var(--radius) * 1.5);
		font-size: 1.3rem;
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
		min-width: 280px;
		box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.3);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none !important;
	}

	.create-btn {
		background: linear-gradient(135deg, #c6a664, #d4b875);
		color: hsl(var(--card-foreground));
	}

	.create-btn:hover {
		transform: translateY(-3px);
		box-shadow: 0 12px 35px -5px rgba(0, 0, 0, 0.4);
	}

	.join-btn {
		background: linear-gradient(135deg, hsl(var(--primary)), #b91c1c);
		color: hsl(var(--primary-foreground));
	}

	.join-btn:hover {
		transform: translateY(-3px);
		box-shadow: 0 12px 35px -5px rgba(165, 36, 34, 0.4);
	}

	.primary-btn {
		background: linear-gradient(135deg, #c6a664, #d4b875);
		color: hsl(var(--card-foreground));
	}

	.primary-btn:hover {
		transform: translateY(-3px);
		box-shadow: 0 12px 35px -5px rgba(0, 0, 0, 0.4);
	}

	.destructive-btn {
		background: linear-gradient(135deg, hsl(var(--primary)), #b91c1c);
		color: hsl(var(--primary-foreground));
	}

	.destructive-btn:hover {
		transform: translateY(-3px);
		box-shadow: 0 12px 35px -5px rgba(165, 36, 34, 0.4);
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

		.button-subtitle {
			font-size: 0.9rem;
			max-width: 250px;
		}
	}
</style>
