<script lang="ts">
	import { onMount } from 'svelte';
	import { getJWTToken } from '$lib/utils/jwt';

	export let mode: 'login' | 'register' = 'login';
	export let apiEndpoint: string;
	export let successRedirectUrl: string = '/';

	let email = '';
	let password = '';
	let confirmPassword = '';
	let nickname = '';
	let error = '';
	let isLoading = false;

	$: title = mode === 'login' ? '登入' : '註冊';
	$: submitText = mode === 'login' ? '登入' : '註冊';
	$: loadingText = mode === 'login' ? '登入中...' : '註冊中...';
	$: footerText = mode === 'login' ? '還沒有帳號？點此註冊' : '已有帳號？點此登入';
	$: footerLink = mode === 'login' ? '/auth/register' : '/auth/login';

	// 檢查用戶是否已經登入，如果已登入則重定向到首頁
	onMount(async () => {
		const token = getJWTToken();
		if (token) {
			// 驗證 token 是否有效
			try {
				const response = await fetch('/api/user/profile', {
					headers: {
						Authorization: `Bearer ${token}`
					}
				});

				if (response.ok) {
					// Token 有效，用戶已登入，重定向到首頁
					window.location.href = '/';
				} else {
					// Token 無效，清除它
					localStorage.removeItem('jwt_token');
					document.cookie = 'jwt=; path=/; max-age=0';
				}
			} catch (error) {
				// 驗證失敗，清除 token
				console.error('Token 驗證失敗:', error);
				localStorage.removeItem('jwt_token');
				document.cookie = 'jwt=; path=/; max-age=0';
			}
		}
	});

	async function handleSubmit() {
		if (isLoading) return;

		error = '';

		// 註冊時檢查密碼確認
		if (mode === 'register' && password !== confirmPassword) {
			error = '密碼確認不一致';
			return;
		}

		// 註冊時檢查暱稱長度
		if (mode === 'register' && nickname.length < 2) {
			error = '暱稱至少需要 2 個字元';
			return;
		}

		isLoading = true;

		try {
			const body = mode === 'login' ? { email, password } : { email, password, nickname };

			const response = await fetch(apiEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			if (response.ok) {
				const result = await response.json();

				// 儲存 JWT token 到 localStorage
				if (result.token) {
					localStorage.setItem('jwt_token', result.token);
					document.cookie = `jwt=${result.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
				}

				window.location.href = successRedirectUrl;
			} else {
				const result = await response.json();
				console.error('API 錯誤回應:', result); // 調試用
				error = result.message || `${mode === 'login' ? '登入' : '註冊'}失敗，請檢查輸入資料`;
			}
		} catch (err) {
			console.error('請求錯誤:', err); // 調試用
			error = '網路錯誤，請稍後再試';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="auth-container">
	<h1>{title}</h1>

	<form on:submit|preventDefault={handleSubmit} class="auth-form">
		{#if mode === 'register'}
			<div class="form-group">
				<label for="nickname">暱稱</label>
				<input
					id="nickname"
					type="text"
					bind:value={nickname}
					required
					minlength="2"
					disabled={isLoading}
					autocomplete="nickname"
					placeholder="請輸入暱稱"
				/>
			</div>
		{/if}

		<div class="form-group">
			<label for="email">Email</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				required
				disabled={isLoading}
				autocomplete="email"
				placeholder="請輸入Email"
			/>
		</div>

		<div class="form-group">
			<label for="password">密碼</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				required
				disabled={isLoading}
				autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
				placeholder="請輸入密碼"
			/>
		</div>

		{#if mode === 'register'}
			<div class="form-group">
				<label for="confirmPassword">確認密碼</label>
				<input
					id="confirmPassword"
					type="password"
					bind:value={confirmPassword}
					required
					disabled={isLoading}
					autocomplete="new-password"
					placeholder="請再次輸入密碼"
				/>
			</div>
		{/if}

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<button type="submit" disabled={isLoading} class="submit-btn">
			{#if isLoading}
				{loadingText}
			{:else}
				{submitText}
			{/if}
		</button>
	</form>

	<div class="form-footer">
		<a href={footerLink} data-sveltekit-reload>{footerText}</a>
	</div>
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
		margin-bottom: 2rem;
		color: hsl(var(--card-foreground));
		font-size: 1.8rem;
		font-weight: 600;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.3);
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	input {
		padding: 0.75rem 1rem;
		border: 2px solid hsl(var(--border));
		border-radius: calc(var(--radius));
		font-size: 1rem;
		background: var(--gradient-antique);
		color: hsl(var(--card-foreground));
		transition: var(--transition-elegant);
	}

	input:focus {
		border-color: hsl(var(--ring));
		outline: none;
		box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2);
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		color: hsl(var(--destructive));
		background: none;
		border: none;
		border-radius: calc(var(--radius));
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		text-align: center;
		margin-bottom: 0.5rem;
		opacity: 0;
		transform: translateY(-10px);
		animation: fadeInError 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
	}

	@keyframes fadeInError {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.submit-btn {
		padding: 0.875rem 1rem;
		border: none;
		border-radius: calc(var(--radius));
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
		margin-top: 0.5rem;
		box-shadow: var(--shadow-antique);
	}

	.submit-btn:hover:not(:disabled) {
		background: hsl(var(--secondary) / 0.9);
		transform: translateY(-1px);
		box-shadow: var(--gradient-shadow);
	}

	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.form-footer {
		text-align: center;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid hsl(var(--border));
	}

	.form-footer a {
		color: hsl(var(--accent));
		text-decoration: none;
		font-size: 0.9rem;
		transition: var(--transition-elegant);
	}

	.form-footer a:hover {
		color: hsl(var(--accent) / 0.8);
		text-decoration: underline;
	}

	/* 響應式設計 */
	@media (max-width: 480px) {
		.auth-container {
			padding: 1rem;
		}

		h1 {
			font-size: 1.5rem;
		}
	}
</style>
