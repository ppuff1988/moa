<script lang="ts">
	import { page } from '$app/stores';
	import ActionButton from '$lib/components/ui/ActionButton.svelte';

	const getErrorTitle = (status: number) => {
		switch (status) {
			case 404:
				return '迷失古董局';
			case 403:
				return '此路不通';
			case 500:
				return '局中局亂了';
			default:
				return '出現問題';
		}
	};

	const getErrorSubtitle = (status: number) => {
		switch (status) {
			case 404:
				return '您尋找的寶物似乎已遺失在歷史長河中';
			case 403:
				return '您沒有權限進入此處';
			case 500:
				return '伺服器遇到了一些問題，請稍後再試';
			default:
				return '遇到了一些技術問題';
		}
	};

	const goHome = () => {
		window.location.href = '/';
	};
</script>

<div class="error-layout">
	<div class="background-blur"></div>

	<div class="header">
		<h1 class="main-title">古董局中局</h1>
		<div class="gradient-line"></div>
	</div>

	<div class="error-card">
		<div class="error-code">{$page.status}</div>

		<h2 class="error-title">{getErrorTitle($page.status)}</h2>
		<p class="error-subtitle">{getErrorSubtitle($page.status)}</p>

		<div class="gradient-divider"></div>

		<ActionButton
			onClick={goHome}
			variant="primary"
			title="返回首頁"
			subtitle="回到古董局中局的起點"
		/>
	</div>

	<p class="footer-text">傳承千年智慧，品鑑古董真偽</p>
</div>

<style>
	.error-layout {
		background-color: hsl(var(--background));
		position: relative;
		min-height: 100vh;
		width: 100%;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 2rem 0;
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

	.error-card {
		position: relative;
		z-index: 1;
		padding: 3rem 2.5rem;
		border-radius: calc(var(--radius) * 2);
		box-shadow: var(--shadow-antique);
		background: var(--gradient-antique);
		border: 1px solid hsl(var(--border));
		min-width: 320px;
		max-width: 600px;
		width: 100%;
		margin: 0 2rem;
		transition: var(--transition-elegant);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.error-card:hover {
		box-shadow: var(--gradient-shadow);
		transform: translateY(-2px);
	}

	.error-code {
		font-size: 5rem;
		font-weight: 700;
		color: #dc2626;
		line-height: 1;
		margin: 0 0 1.5rem 0;
		letter-spacing: -0.02em;
		opacity: 0.8;
	}

	.error-title {
		font-size: 2rem;
		font-weight: 600;
		color: hsl(var(--card-foreground));
		margin: 0 0 1rem 0;
		letter-spacing: 0.05em;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.3);
	}

	.error-subtitle {
		font-size: 1rem;
		color: hsl(var(--muted-foreground));
		margin: 0 0 2rem 0;
		line-height: 1.6;
	}

	.gradient-divider {
		width: 8rem;
		height: 0.2rem;
		background: linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)));
		margin: 1.5rem auto;
		border-radius: 9999px;
	}

	.footer-text {
		position: relative;
		z-index: 1;
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

	.footer-text::before,
	.footer-text::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			hsl(var(--muted-foreground) / 0.3),
			transparent
		);
	}

	@media (max-width: 768px) {
		.error-layout {
			padding: 1rem 0;
		}

		.main-title {
			font-size: 2.5rem;
		}

		.error-card {
			margin: 0 1rem;
			padding: 2rem 1.5rem;
		}

		.error-code {
			font-size: 4rem;
		}

		.error-title {
			font-size: 1.5rem;
		}

		.error-subtitle {
			font-size: 0.9rem;
		}
	}
</style>
