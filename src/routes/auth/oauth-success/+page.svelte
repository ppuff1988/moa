<script lang="ts">
	import { onMount } from 'svelte';

	let status: 'loading' | 'success' | 'error' = 'loading';
	let errorMessage = '';

	onMount(async () => {
		try {
			console.log('🔄 OAuth Success 頁面載入');

			// 從 URL 參數中取得 token
			const urlParams = new URLSearchParams(window.location.search);
			const token = urlParams.get('token');

			console.log('   Token 來源: URL 參數');
			console.log('   Token 存在:', token ? '✓' : '❌');

			if (token) {
				// 直接使用 URL 參數中的 token
				localStorage.setItem('jwt_token', token);

				// 同步到 cookie（供前端使用，非 httpOnly）
				document.cookie = `jwt=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

				status = 'success';
				console.log('✅ Token 已儲存到 localStorage 和 cookie');

				// 1 秒後重定向到首頁
				setTimeout(() => {
					window.location.href = '/';
				}, 1000);
			} else {
				// 如果 URL 沒有 token，嘗試使用舊方法（調用 API）
				console.log('   嘗試調用 exchange-jwt API...');
				const response = await fetch('/api/auth/exchange-jwt', {
					method: 'POST',
					credentials: 'include'
				});

				if (response.ok) {
					const result = await response.json();

					if (result.success && result.data?.token) {
						localStorage.setItem('jwt_token', result.data.token);
						document.cookie = `jwt=${result.data.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

						status = 'success';

						setTimeout(() => {
							window.location.href = '/';
						}, 1000);
					} else {
						status = 'error';
						errorMessage = result.message || '無法取得認證 token';
					}
				} else {
					status = 'error';
					errorMessage = '認證失敗，請重新登入';
				}
			}
		} catch (error) {
			console.error('OAuth success error:', error);
			status = 'error';
			errorMessage = '發生錯誤，請重新登入';
		}
	});
</script>

<div class="status-container">
	{#if status === 'loading'}
		<div class="status-card loading">
			<div class="antique-spinner">
				<div class="spinner-ring"></div>
				<div class="spinner-center">驗</div>
			</div>
			<h2>登入處理中</h2>
			<p>正在完成登入程序，請稍候...</p>
		</div>
	{:else if status === 'success'}
		<div class="status-card success">
			<div class="success-seal">
				<svg viewBox="0 0 100 100" class="seal-bg">
					<circle cx="50" cy="50" r="45" fill="hsl(var(--accent))" />
					<circle
						cx="50"
						cy="50"
						r="35"
						fill="none"
						stroke="hsl(var(--accent-foreground))"
						stroke-width="2"
					/>
				</svg>
				<div class="seal-text">真</div>
			</div>
			<h2>登入成功</h2>
			<p>即將為您跳轉到首頁...</p>
			<div class="progress-bar">
				<div class="progress-fill"></div>
			</div>
		</div>
	{:else}
		<div class="status-card error">
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
			<h2>登入失敗</h2>
			<p class="error-message">{errorMessage}</p>
			<a href="/auth/login" class="retry-btn">返回登入頁面</a>
		</div>
	{/if}
</div>

<style>
	.status-container {
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}

	.status-card {
		background: var(--gradient-antique);
		border: 2px solid hsl(var(--border));
		border-radius: calc(var(--radius) * 2);
		padding: 3rem 2rem;
		text-align: center;
		box-shadow: var(--shadow-antique);
		transition: var(--transition-elegant);
	}

	.status-card h2 {
		margin: 1.5rem 0 0.75rem;
		color: hsl(var(--card-foreground));
		font-size: 1.75rem;
		font-weight: 500;
		letter-spacing: 0.05em;
	}

	.status-card p {
		color: hsl(var(--muted-foreground));
		font-size: 1rem;
		margin: 0;
		line-height: 1.6;
	}

	/* Loading state - Ancient Chinese spinner */
	.antique-spinner {
		width: 100px;
		height: 100px;
		margin: 0 auto;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spinner-ring {
		position: absolute;
		width: 100%;
		height: 100%;
		border: 3px solid transparent;
		border-top-color: hsl(var(--primary));
		border-right-color: hsl(var(--secondary));
		border-radius: 50%;
		animation: rotate 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
	}

	.spinner-center {
		font-size: 2.5rem;
		color: hsl(var(--primary));
		font-weight: 600;
		z-index: 1;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes rotate {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(0.95);
		}
	}

	/* Success state - Chinese seal style */
	.success-seal,
	.error-seal {
		width: 120px;
		height: 120px;
		margin: 0 auto;
		position: relative;
		animation: sealAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.seal-bg {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 4px 12px hsl(var(--accent) / 0.3));
	}

	.seal-text {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 3rem;
		font-weight: 700;
		color: hsl(var(--accent-foreground));
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.error-seal .seal-bg {
		filter: drop-shadow(0 4px 12px hsl(var(--primary) / 0.3));
	}

	.error-seal .seal-text {
		color: hsl(var(--primary-foreground));
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

	/* Progress bar for success state */
	.progress-bar {
		width: 100%;
		height: 4px;
		background: hsl(var(--border));
		border-radius: 2px;
		margin-top: 1.5rem;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)));
		border-radius: 2px;
		animation: fillProgress 1s ease-out forwards;
	}

	@keyframes fillProgress {
		from {
			width: 0%;
		}
		to {
			width: 100%;
		}
	}

	/* Error message */
	.error-message {
		color: hsl(var(--destructive));
		margin: 1rem 0;
		padding: 0.75rem 1rem;
		background: hsl(var(--destructive) / 0.1);
		border-radius: calc(var(--radius));
		border: 1px solid hsl(var(--destructive) / 0.3);
	}

	/* Retry button */
	.retry-btn {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.875rem 2rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		text-decoration: none;
		border-radius: calc(var(--radius));
		font-weight: 500;
		font-size: 1rem;
		transition: var(--transition-elegant);
		box-shadow: var(--shadow-antique);
		border: 1px solid hsl(var(--secondary));
	}

	.retry-btn:hover {
		transform: translateY(-2px);
		box-shadow: var(--gradient-shadow);
		text-decoration: none;
	}

	/* Responsive design */
	@media (max-width: 640px) {
		.status-card {
			padding: 2rem 1.5rem;
		}

		.status-card h2 {
			font-size: 1.5rem;
		}

		.success-seal,
		.error-seal {
			width: 100px;
			height: 100px;
		}

		.seal-text {
			font-size: 2.5rem;
		}
	}
</style>
