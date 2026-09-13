<script lang="ts">
	import { page } from '$app/state';
</script>

<main id="leaderboard-content">
	<p class="eyebrow">名家榜 · {page.status}</p>
	<h1>{page.status === 503 ? '榜單暫時無法載入' : '找不到這份榜單'}</h1>
	<p>{page.error?.message}</p>
	<div>
		{#if page.status === 503}<a href={page.url.pathname + page.url.search} data-sveltekit-reload
				>重新載入</a
			>{/if}<a href="/leaderboard">返回總勝場榜</a>
	</div>
</main>

<style>
	main {
		width: min(100% - 2.5rem, 50rem);
		margin-inline: auto;
		padding-block: 6rem;
		min-height: 65dvh;
	}
	h1 {
		color: hsl(var(--foreground));
		font-family: 'Noto Serif TC', 'Noto Serif CJK TC', serif;
		font-size: clamp(1.6rem, 4vw, 2.5rem);
		font-weight: 500;
	}
	p {
		color: #afa599;
		line-height: 1.8;
	}
	.eyebrow {
		color: hsl(var(--secondary));
		font-size: 0.75rem;
		letter-spacing: 0.15em;
	}
	div {
		display: flex;
		gap: 1.5rem;
		margin-top: 2rem;
	}
	a {
		color: hsl(var(--secondary));
		padding: 0.75rem 0;
	}
	a:focus-visible {
		outline: 2px solid hsl(var(--secondary));
		outline-offset: 4px;
	}
</style>
