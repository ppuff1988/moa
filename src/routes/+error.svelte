<script lang="ts">
	import { page } from '$app/stores';
	import MainTitle from '$lib/components/ui/MainTitle.svelte';
	import ActionButton from '$lib/components/ui/ActionButton.svelte';
	import FooterDecoration from '$lib/components/ui/FooterDecoration.svelte';

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

<div class="error-page">
	<div class="error-container">
		<div class="error-decoration">
			<div class="ancient-pattern top-left"></div>
			<div class="ancient-pattern top-right"></div>
			<div class="ancient-pattern bottom-left"></div>
			<div class="ancient-pattern bottom-right"></div>
		</div>

		<div class="error-content">
			<div class="error-code">{$page.status}</div>

			<MainTitle title={getErrorTitle($page.status)} subtitle={getErrorSubtitle($page.status)} />

			<div class="action-area">
				<ActionButton
					onClick={goHome}
					variant="primary"
					title="返回首頁"
					subtitle="回到古董局中局的起點"
				/>
			</div>
		</div>

		<FooterDecoration text="古董局中局" />
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-image: url('/background.jpg');
		background-size: cover;
		background-position: center;
		background-attachment: fixed;
		position: relative;
		padding: 2rem;
	}

	.error-page::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(
			circle at center,
			hsl(var(--background) / 0.9),
			hsl(var(--background) / 0.97)
		);
		z-index: 0;
	}

	.error-container {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 900px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3rem;
	}

	.error-decoration {
		position: absolute;
		top: -40px;
		left: -40px;
		right: -40px;
		bottom: -40px;
		pointer-events: none;
		z-index: -1;
	}

	.ancient-pattern {
		position: absolute;
		width: 80px;
		height: 80px;
		border: 2px solid hsl(var(--primary) / 0.4);
		transition: var(--transition-elegant);
	}

	.ancient-pattern::before {
		content: '';
		position: absolute;
		width: 100%;
		height: 100%;
		border: 1px solid hsl(var(--secondary) / 0.3);
		top: 8px;
		left: 8px;
	}

	.top-left {
		top: 0;
		left: 0;
		border-right: none;
		border-bottom: none;
	}

	.top-right {
		top: 0;
		right: 0;
		border-left: none;
		border-bottom: none;
	}

	.bottom-left {
		bottom: 0;
		left: 0;
		border-right: none;
		border-top: none;
	}

	.bottom-right {
		bottom: 0;
		right: 0;
		border-left: none;
		border-top: none;
	}

	.error-content {
		width: 100%;
		background: linear-gradient(135deg, hsl(var(--card)), hsl(38 20% 80%));
		border-radius: calc(var(--radius) * 2);
		padding: 4rem 3rem;
		box-shadow:
			0 10px 40px -10px hsl(var(--background) / 0.8),
			inset 0 1px 0 hsl(42 30% 90% / 0.4);
		border: 1px solid hsl(var(--secondary) / 0.2);
		backdrop-filter: blur(10px);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.error-code {
		font-size: 8rem;
		font-weight: 700;
		background: linear-gradient(135deg, hsl(var(--primary)), hsl(1 70% 45%));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1;
		margin: 0;
		letter-spacing: 0.1em;
		filter: drop-shadow(0 4px 12px hsl(var(--primary) / 0.3));
	}

	.action-area {
		margin-top: 1rem;
		width: 100%;
		display: flex;
		justify-content: center;
	}

	@media (max-width: 768px) {
		.error-page {
			padding: 1rem;
		}

		.error-content {
			padding: 3rem 2rem;
		}

		.error-code {
			font-size: 5rem;
		}

		.ancient-pattern {
			width: 50px;
			height: 50px;
		}

		.error-decoration {
			top: -20px;
			left: -20px;
			right: -20px;
			bottom: -20px;
		}
	}

	@media (max-width: 480px) {
		.error-code {
			font-size: 4rem;
		}

		.ancient-pattern {
			width: 40px;
			height: 40px;
		}
	}
</style>
