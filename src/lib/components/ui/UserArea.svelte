<script lang="ts">
	export let nickname: string;
	export let onLogout: () => void;
</script>

<div class="user-area">
	<span class="welcome-text">歡迎，{nickname}</span>
	<button on:click={onLogout} class="logout-btn">登出</button>
</div>

<style>
	.user-area {
		position: absolute;
		top: 2rem;
		right: 2rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		z-index: 10;
	}

	.welcome-text {
		color: hsl(var(--foreground));
		font-size: 1rem;
		font-weight: 500;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.logout-btn {
		background: transparent;
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--foreground) / 0.3);
		border-radius: calc(var(--radius));
		padding: 0.5rem 1rem;
		font-weight: 500;
		font-size: 0.9rem;
		cursor: pointer;
		transition: var(--transition-elegant);
		backdrop-filter: blur(10px);
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.logout-btn:hover {
		background: hsl(var(--foreground) / 0.1);
		border-color: hsl(var(--foreground) / 0.5);
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.user-area {
			top: 1rem;
			right: 1rem;
			flex-direction: column;
			gap: 0.5rem;
			align-items: flex-end;
		}

		.welcome-text {
			font-size: 0.9rem;
		}

		.logout-btn {
			padding: 0.4rem 0.8rem;
			font-size: 0.8rem;
		}
	}
</style>
