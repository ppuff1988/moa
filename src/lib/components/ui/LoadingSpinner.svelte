<script lang="ts">
	export let message: string = '載入中...';
</script>

<div class="loading-container">
	<div class="loading-wrapper">
		<div class="loading-spinner"></div>
		<div class="loading-pulse"></div>
	</div>
	<p class="loading-message">{message}</p>
</div>

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		gap: 1.5rem;
		padding: 2rem;
	}

	.loading-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
	}

	.loading-spinner {
		width: 3.5rem;
		height: 3.5rem;
		border: 4px solid rgba(212, 175, 55, 0.2);
		border-top: 4px solid #d4af37;
		border-radius: 50%;
		animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
		box-shadow:
			0 0 20px rgba(212, 175, 55, 0.3),
			inset 0 0 10px rgba(212, 175, 55, 0.1);
		position: relative;
		z-index: 2;
	}

	.loading-pulse {
		position: absolute;
		width: 100%;
		height: 100%;
		border: 3px solid rgba(212, 175, 55, 0.4);
		border-radius: 50%;
		animation: pulse-ring 2s ease-out infinite;
	}

	.loading-message {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		text-align: center;
		letter-spacing: 0.02em;
		animation: fade-in-out 2s ease-in-out infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse-ring {
		0% {
			transform: scale(0.8);
			opacity: 1;
		}
		100% {
			transform: scale(1.4);
			opacity: 0;
		}
	}

	@keyframes fade-in-out {
		0%,
		100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
		}
	}

	@media (max-width: 768px) {
		.loading-container {
			min-height: 40vh;
			gap: 1.25rem;
			padding: 1.5rem;
		}

		.loading-wrapper {
			width: 70px;
			height: 70px;
		}

		.loading-spinner {
			width: 3rem;
			height: 3rem;
			border-width: 3px;
		}

		.loading-message {
			font-size: 1rem;
		}
	}
</style>
