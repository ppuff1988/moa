<script lang="ts">
	import '../../app.css';
	let { children } = $props();
</script>

<div class="auth-layout">
	<div class="background-blur"></div>
	<nav class="auth-navigation" aria-label="返回網站">
		<a href="/" class="back-home"><span aria-hidden="true">←</span> 返回首頁</a>
	</nav>
	<div class="header">
		<h1 class="main-title">古董局中局</h1>
		<div class="gradient-line"></div>
	</div>
	<div class="content">
		{@render children?.()}
	</div>
</div>

<style>
	.auth-layout {
		background-color: hsl(var(--background));
		position: relative;
		min-height: 100dvh;
		width: 100%;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 1.5rem 1.25rem 2rem;
	}

	.auth-navigation {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 72rem;
		margin-bottom: 1.5rem;
	}

	.back-home {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		min-height: 2.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid hsl(var(--secondary) / 0.3);
		border-radius: 0.25rem;
		background: hsl(var(--background) / 0.75);
		color: hsl(var(--foreground));
		font-size: 0.875rem;
		text-decoration: none;
		transition:
			background 200ms,
			color 200ms;
	}

	.back-home:hover {
		background: hsl(var(--background));
		color: hsl(var(--secondary));
	}

	.back-home:focus-visible {
		outline: 2px solid hsl(var(--secondary));
		outline-offset: 4px;
	}

	.back-home:active {
		transform: translateY(1px);
	}

	.background-blur {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: url('/background.jpg');
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		filter: blur(12px) brightness(0.7);
		z-index: 0;
	}

	.header {
		position: relative;
		z-index: 1;
		margin-bottom: 2rem;
	}

	.main-title {
		color: hsl(var(--foreground));
		font-size: 3.5rem;
		font-weight: 400;
		text-align: center;
		margin: 0;
		text-shadow: 0 4px 8px hsl(var(--background) / 0.8);
		letter-spacing: 0.1em;
	}

	.gradient-line {
		width: 10rem;
		height: 0.25rem;
		background: linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)));
		margin: 1.25rem auto 0;
		border-radius: 9999px;
	}

	.content {
		position: relative;
		z-index: 1;
		padding: 2rem 2.5rem;
		border-radius: calc(var(--radius) * 2);
		box-shadow: var(--shadow-antique);
		background: var(--gradient-antique);
		border: 1px solid hsl(var(--border));
		min-width: 0;
		max-width: 600px;
		width: 100%;
		margin: 0;
		transition: var(--transition-elegant);
	}

	.content:hover {
		box-shadow: var(--gradient-shadow);
		transform: translateY(-2px);
	}

	@media (max-width: 768px) {
		.auth-layout {
			padding: 1rem 1rem 2rem;
		}

		.main-title {
			font-size: 2.5rem;
		}

		.content {
			padding: 1.5rem 0.5rem;
		}
	}
</style>
