<script lang="ts">
	export let message: string = '載入中...';
</script>

<div class="loading-container">
	<div class="loading-spinner"></div>
	<p>{message}</p>
</div>

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		gap: 1rem;
	}

	.loading-container p {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid rgba(212, 175, 55, 0.3);
		border-top: 3px solid #d4af37;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
