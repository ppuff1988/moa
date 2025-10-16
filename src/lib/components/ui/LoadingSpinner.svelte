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

	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid hsl(var(--muted));
		border-top: 3px solid hsl(var(--primary));
		border-radius: 50%;
		animation: spin 1s linear infinite;
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
