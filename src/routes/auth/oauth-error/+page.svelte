<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let countdown = 5;
	let errorMessage = '您的登入 session 已過期或無效';
	let suggestions = [
		'這可能是因為您在 OAuth 流程中等待太久（超過10分鐘）',
		'或是您重複點擊了登入按鈕',
		'或是您刷新了此頁面'
	];

	onMount(() => {
		const interval = setInterval(() => {
			countdown--;
			if (countdown === 0) {
				goto('/auth/login');
			}
		}, 1000);

		return () => clearInterval(interval);
	});

	function handleRetry() {
		goto('/auth/login');
	}
</script>

<div class="status-container">
	<div class="status-card">
		<div class="error-seal">
			<svg viewBox="0 0 100 100" class="seal-bg">
				<circle cx="50" cy="50" r="45" fill="hsl(var(--primary))" />
				<circle
					cx="50"
					cy="50"
					r="35"
					fill="none"
					stroke="hsl(var(--primary-foreground))"
					stroke-width="2"
				/>
			</svg>
			<div class="seal-text">偽</div>
		</div>

		<h2>OAuth 驗證失敗</h2>
		<p class="main-error">{errorMessage}</p>

		<div class="divider"></div>

		<div class="info-section">
			<h3>可能的原因</h3>
			<ul class="reason-list">
				{#each suggestions as suggestion, i (i)}
					<li>
						<span class="bullet">●</span>
						<span>{suggestion}</span>
					</li>
				{/each}
			</ul>
		</div>

		<div class="actions">
			<button on:click={handleRetry} class="retry-btn">
				<span class="btn-icon">↻</span>
				重新登入
			</button>
			<p class="countdown">
				{countdown} 秒後自動跳轉
			</p>
		</div>
	</div>
</div>

<style>
	.status-container {
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	.status-card {
		background: var(--gradient-antique);
		border: 2px solid hsl(var(--border));
		border-radius: calc(var(--radius) * 2);
		padding: 3rem 2.5rem;
		text-align: center;
		box-shadow: var(--shadow-antique);
		transition: var(--transition-elegant);
	}

	/* Error seal - Chinese style */
	.error-seal {
		width: 120px;
		height: 120px;
		margin: 0 auto 1.5rem;
		position: relative;
		animation: sealAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.seal-bg {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 4px 12px hsl(var(--primary) / 0.3));
	}

	.seal-text {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 3rem;
		font-weight: 700;
		color: hsl(var(--primary-foreground));
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	@keyframes sealAppear {
		0% {
			opacity: 0;
			transform: scale(0) rotate(-180deg);
		}
		100% {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
	}

	/* Typography */
	h2 {
		margin: 0 0 1rem;
		color: hsl(var(--card-foreground));
		font-size: 1.75rem;
		font-weight: 500;
		letter-spacing: 0.05em;
	}

	h3 {
		margin: 0 0 0.75rem;
		color: hsl(var(--card-foreground));
		font-size: 1.1rem;
		font-weight: 500;
		text-align: left;
	}

	.main-error {
		color: hsl(var(--destructive));
		font-size: 1rem;
		margin: 0 0 1.5rem;
		padding: 1rem;
		background: hsl(var(--destructive) / 0.1);
		border-radius: calc(var(--radius));
		border: 1px solid hsl(var(--destructive) / 0.3);
		line-height: 1.6;
	}

	/* Divider */
	.divider {
		height: 1px;
		background: linear-gradient(to right, transparent, hsl(var(--border)), transparent);
		margin: 1.5rem 0;
	}

	/* Info section */
	.info-section {
		text-align: left;
		background: hsl(var(--muted) / 0.3);
		border: 1px solid hsl(var(--border));
		border-radius: calc(var(--radius));
		padding: 1.25rem 1.5rem;
		margin-bottom: 1.5rem;
	}

	.reason-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.reason-list li {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin: 0.75rem 0;
		color: hsl(var(--muted-foreground));
		line-height: 1.6;
	}

	.bullet {
		color: hsl(var(--primary));
		font-size: 0.75rem;
		margin-top: 0.3rem;
		flex-shrink: 0;
	}

	/* Actions */
	.actions {
		margin: 2rem 0 1.5rem;
	}

	.retry-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 2rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		border: 1px solid hsl(var(--secondary));
		border-radius: calc(var(--radius));
		font-weight: 500;
		font-size: 1rem;
		cursor: pointer;
		transition: var(--transition-elegant);
		box-shadow: var(--shadow-antique);
	}

	.retry-btn:hover {
		transform: translateY(-2px);
		box-shadow: var(--gradient-shadow);
	}

	.btn-icon {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.countdown {
		margin-top: 1rem;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.countdown::before,
	.countdown::after {
		content: '—';
		color: hsl(var(--border));
	}

	/* Responsive design */
	@media (max-width: 640px) {
		.status-card {
			padding: 2rem 1.5rem;
		}

		h2 {
			font-size: 1.5rem;
		}

		.error-seal {
			width: 100px;
			height: 100px;
		}

		.seal-text {
			font-size: 2.5rem;
		}

		.info-section {
			padding: 1rem 1.25rem;
		}

		.retry-btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
