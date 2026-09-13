<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="leaderboard-shell">
	<a class="skip-link" href="#leaderboard-content">跳至排行榜內容</a>
	<header class="leaderboard-header">
		<nav aria-label="排行榜導覽">
			<a href="/" class="brand" aria-label="古董局中局首頁"
				><img src="/pwa-icon-192.png" alt="古董局中局金色龍首 Logo" width="44" height="44" /><span
					>古董局中局<small>玩家榮譽 · 名家榜</small></span
				></a
			><a href="/" class="home-link"><span aria-hidden="true">←</span> 返回首頁</a>
		</nav>
	</header>
	{@render children()}
	<footer><span>古董局中局 · 非官方桌遊輔助工具</span><a href="/terms">使用者條款</a></footer>
</div>

<style>
	.leaderboard-shell {
		position: relative;
		min-height: 100dvh;
		background: hsl(var(--background) / 0.95);
		font-family:
			'Noto Sans TC', 'Noto Sans CJK TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
	}
	.leaderboard-header {
		border-bottom: 1px solid hsl(var(--secondary) / 0.2);
	}
	nav,
	footer {
		width: min(100% - 4rem, 74rem);
		margin-inline: auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
	}
	nav {
		min-height: 5.75rem;
	}
	a {
		color: hsl(var(--foreground));
		text-decoration: none;
	}
	a:hover {
		color: hsl(var(--secondary));
		text-decoration: none;
	}
	a:focus-visible {
		outline: 2px solid hsl(var(--secondary));
		outline-offset: 4px;
	}
	.brand {
		display: flex;
		gap: 0.9rem;
		align-items: center;
		font-family: 'Noto Serif TC', 'Noto Serif CJK TC', 'Songti TC', serif;
		font-size: 1.15rem;
		letter-spacing: 0.1em;
	}
	.brand img {
		flex-shrink: 0;
	}
	.brand small {
		display: block;
		color: #afa599;
		font: 0.625rem sans-serif;
		letter-spacing: 0.13em;
		margin-top: 0.3rem;
	}
	.home-link {
		font-size: 0.75rem;
		display: inline-flex;
		gap: 0.65rem;
		align-items: center;
		min-height: 2.75rem;
	}
	footer {
		padding-block: 1.5rem;
		border-top: 1px solid hsl(var(--secondary) / 0.2);
		color: #afa599;
		font-size: 0.6875rem;
	}
	footer a {
		color: inherit;
		padding-block: 0.6rem;
	}
	.skip-link {
		position: absolute;
		top: 0.5rem;
		left: 1rem;
		padding: 0.75rem;
		background: hsl(var(--background));
		transform: translateY(-200%);
		z-index: 2;
	}
	.skip-link:focus {
		transform: translateY(0);
	}
	@media (max-width: 700px) {
		nav,
		footer {
			width: calc(100% - 2.5rem);
		}
		nav {
			min-height: 4.75rem;
			gap: 1rem;
		}
		.brand {
			font-size: 0.95rem;
			gap: 0.6rem;
		}
		.brand img {
			width: 2.25rem;
			height: 2.25rem;
		}
		.brand small {
			font-size: 0.5625rem;
		}
		.home-link {
			font-size: 0.6875rem;
		}
		footer {
			flex-wrap: wrap;
			gap: 0.5rem;
			font-size: 0.625rem;
		}
	}
</style>
