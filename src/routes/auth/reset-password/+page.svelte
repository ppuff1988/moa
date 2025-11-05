<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import PasswordInput from '$lib/components/ui/PasswordInput.svelte';

	let token = '';
	let password = '';
	let confirmPassword = '';
	let error = '';
	let success = '';
	let isLoading = false;
	let isValidatingToken = true;
	let tokenValid = false;

	onMount(async () => {
		// 從 URL 獲取 token
		token = $page.url.searchParams.get('token') || '';

		if (!token) {
			error = '缺少重置 token';
			isValidatingToken = false;
			return;
		}

		// 驗證 token（不實際重置，只檢查有效性）
		// 這裡我們簡單地標記為有效，實際驗證會在提交時進行
		isValidatingToken = false;
		tokenValid = true;
	});

	async function handleSubmit() {
		if (isLoading) return;

		error = '';
		success = '';

		if (!password) {
			error = '請輸入新密碼';
			return;
		}

		if (password.length < 6) {
			error = '密碼長度至少需要 6 個字元';
			return;
		}

		if (password !== confirmPassword) {
			error = '密碼確認不一致';
			return;
		}

		isLoading = true;

		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token, password })
			});

			const result = await response.json();

			if (response.ok) {
				success = result.message;
				// 3 秒後跳轉到登入頁面
				setTimeout(() => {
					window.location.href = '/auth/login';
				}, 3000);
			} else {
				error = result.message || '重置失敗，請稍後再試';
			}
		} catch (err) {
			console.error('請求錯誤:', err);
			error = '網路錯誤，請稍後再試';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="auth-container">
	<h1>重置密碼</h1>

	{#if isValidatingToken}
		<div class="loading-message">
			<p>正在驗證重置連結...</p>
		</div>
	{:else if !tokenValid}
		<div class="error-container">
			<p class="error-message">{error || '無效的重置連結'}</p>
			<div class="form-footer">
				<a href="/auth/forgot-password">重新申請重置連結</a>
				<span class="separator">•</span>
				<a href="/auth/login">返回登入</a>
			</div>
		</div>
	{:else}
		<p class="description">請輸入您的新密碼</p>

		<form on:submit|preventDefault={handleSubmit} class="auth-form">
			<PasswordInput
				id="password"
				bind:value={password}
				label="新密碼"
				placeholder="請輸入新密碼（至少 6 個字元）"
				disabled={isLoading || !!success}
				autocomplete="new-password"
			/>

			<PasswordInput
				id="confirmPassword"
				bind:value={confirmPassword}
				label="確認新密碼"
				placeholder="請再次輸入新密碼"
				disabled={isLoading || !!success}
				autocomplete="new-password"
			/>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			{#if success}
				<div class="success-message">
					{success}
					<br />
					<span class="redirect-info">3 秒後將自動跳轉到登入頁面...</span>
				</div>
			{/if}

			<button type="submit" disabled={isLoading || !!success} class="submit-btn">
				<span class="btn-content">
					{#if isLoading}
						重置中...
					{:else if success}
						重置成功
					{:else}
						重置密碼
					{/if}
				</span>
			</button>
		</form>

		{#if !success}
			<div class="form-footer">
				<a href="/auth/login">返回登入</a>
			</div>
		{/if}
	{/if}
</div>

<style>
	.auth-container {
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		text-align: center;
		margin-bottom: 0.5rem;
		color: hsl(var(--card-foreground));
		font-size: 1.8rem;
		font-weight: 600;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.3);
	}

	.description {
		text-align: center;
		color: hsl(var(--muted-foreground));
		margin-bottom: 2rem;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.loading-message {
		text-align: center;
		padding: 2rem 1rem;
		color: hsl(var(--muted-foreground));
	}

	.error-container {
		text-align: center;
		padding: 1rem 0;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.error-message {
		color: hsl(var(--destructive));
		background: hsl(var(--destructive) / 0.1);
		border: 1px solid hsl(var(--destructive) / 0.3);
		border-radius: calc(var(--radius));
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		text-align: center;
	}

	.success-message {
		color: hsl(var(--accent));
		background: hsl(var(--accent) / 0.1);
		border: 1px solid hsl(var(--accent) / 0.3);
		border-radius: calc(var(--radius));
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		text-align: center;
	}

	.redirect-info {
		font-size: 0.8rem;
		opacity: 0.8;
		margin-top: 0.5rem;
		display: inline-block;
	}

	.submit-btn {
		width: 100%;
		padding: 0.875rem 1rem;
		border: none;
		border-radius: calc(var(--radius));
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
		box-shadow: var(--shadow-antique);
		position: relative;
		overflow: hidden;
	}

	.submit-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, hsl(42 40% 70%), hsl(42 35% 60%));
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: var(--gradient-shadow);
	}

	.submit-btn:hover:not(:disabled)::before {
		opacity: 1;
	}

	.submit-btn:active:not(:disabled) {
		transform: translateY(1px);
		box-shadow: 0 4px 12px -3px hsl(var(--secondary) / 0.4);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: var(--shadow-antique);
	}

	.btn-content {
		position: relative;
		z-index: 1;
	}

	.form-footer {
		margin-top: 1.5rem;
		text-align: center;
		font-size: 0.9rem;
		color: hsl(var(--muted-foreground));
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.form-footer a {
		color: hsl(var(--primary));
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s ease;
	}

	.form-footer a:hover {
		color: hsl(var(--primary) / 0.8);
		text-decoration: underline;
	}

	.separator {
		color: hsl(var(--border));
	}

	@media (max-width: 640px) {
		.auth-container {
			padding: 1.5rem;
		}

		h1 {
			font-size: 1.5rem;
		}
	}
</style>
