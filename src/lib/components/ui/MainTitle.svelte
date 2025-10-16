<script lang="ts">
	export let title: string;
	export let subtitle: string;
</script>

<div class="title-section">
	<h1 class="main-title">{title}</h1>
	<p class="subtitle">{subtitle}</p>
	<div class="gradient-line"></div>
</div>

<style>
	.title-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.main-title {
		color: hsl(var(--foreground));
		font-size: 4rem;
		font-weight: 400;
		margin: 0 0 2rem 0;
		text-shadow: 0 4px 8px hsl(var(--background) / 0.8);
		letter-spacing: 0.2em;
	}

	.subtitle {
		color: hsl(var(--muted-foreground));
		font-size: 1.2rem;
		margin: 0 0 2rem 0;
		line-height: 1.8;
		max-width: 600px;
	}

	.gradient-line {
		width: 8rem;
		height: 4px;
		background: linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)));
		margin: 0 auto 4rem;
		border-radius: 2px;
	}

	@media (max-width: 1024px) {
		.main-title {
			font-size: 3.5rem;
		}
	}

	@media (max-width: 768px) {
		.main-title {
			font-size: 2.8rem;
			letter-spacing: 0.1em;
		}

		.subtitle {
			font-size: 1rem;
		}
	}
</style>
