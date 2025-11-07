<script lang="ts">
	export let text: string;
</script>

<div class="footer-decoration">
	<div class="footer-line"></div>
	<span class="footer-text">{text}</span>
	<div class="footer-line"></div>
</div>

<style>
	.footer-decoration {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		width: 100%;
		max-width: 600px;
	}

	.footer-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(to right, transparent, hsl(var(--secondary)), transparent);
	}

	.footer-text {
		color: hsl(var(--secondary));
		font-style: italic;
		font-size: 1.1rem;
		white-space: nowrap;
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.footer-decoration {
			display: none;
		}
	}
</style>
