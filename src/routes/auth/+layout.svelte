<script lang="ts">
	import '../../app.css';
	let { children } = $props();
</script>

<div class="auth-layout">
	<div class="background-blur"></div>
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
		min-height: 100vh;
		width: 100vw;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.background-blur {
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
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
		min-width: 320px;
		max-width: 600px;
		width: 100%;
		margin: 0 2rem;
		transition: var(--transition-elegant);
	}

	.content:hover {
		box-shadow: var(--gradient-shadow);
		transform: translateY(-2px);
	}
</style>
