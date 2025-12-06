<script lang="ts">
	export let text: string = '傳承千年智慧，品鑑古董真偽';
</script>

<div class="footer-decoration">
	<div class="footer-line"></div>
	<p class="footer-text">{text}</p>
	<div class="footer-line"></div>
</div>

<style>
	.footer-decoration {
		margin-top: 2rem;
		color: hsl(var(--muted-foreground));
		font-size: 1.1rem;
		font-style: italic;
		opacity: 0.8;
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		max-width: 600px;
	}

	.footer-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			hsl(var(--muted-foreground) / 0.3),
			transparent
		);
	}

	.footer-text {
		color: hsl(var(--muted-foreground));
		font-size: 1.1rem;
		font-style: italic;
		margin: 0;
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.footer-decoration {
			font-size: 1rem;
		}

		.footer-text {
			font-size: 1rem;
		}
	}
</style>
