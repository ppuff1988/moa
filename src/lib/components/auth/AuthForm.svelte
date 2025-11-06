<script lang="ts">
	import { onMount } from 'svelte';
	import { getJWTToken } from '$lib/utils/jwt';
	import PasswordInput from '$lib/components/ui/PasswordInput.svelte';

	export let mode: 'login' | 'register' = 'login';
	export let apiEndpoint: string;
	export let successRedirectUrl: string = '/';

	let email = '';
	let password = '';
	let confirmPassword = '';
	let nickname = '';
	let acceptTerms = false;
	let error = '';
	let successMessage = '';
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
		successMessage = '';

		// 註冊時檢查使用者條款
		if (mode === 'register' && !acceptTerms) {
			error = '請閱讀並同意使用者條款';
			return;
		}

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

			const result = await response.json();

			if (response.ok) {
				// 註冊成功但需要驗證 email
				if (result.requiresVerification) {
					successMessage = result.message || '註冊成功！請檢查您的信箱以驗證 Email 地址';
					// 清空表單
					email = '';
					password = '';
					confirmPassword = '';
					nickname = '';
					acceptTerms = false;
					return;
				}

				// 儲存 JWT token 到 localStorage
				if (result.token) {
					localStorage.setItem('jwt_token', result.token);
					document.cookie = `jwt=${result.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
				}

				window.location.href = successRedirectUrl;
			} else {
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

	<div class="oauth-section">
		<a href="/auth/google" class="google-btn" data-sveltekit-preload-data="off">
			<span class="google-btn-content">
				<svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						fill="#4285F4"
					/>
					<path
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						fill="#34A853"
					/>
					<path
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						fill="#FBBC05"
					/>
					<path
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						fill="#EA4335"
					/>
				</svg>
				<span>使用 Google 帳號{mode === 'login' ? '登入' : '註冊'}</span>
			</span>
		</a>
	</div>

	<div class="divider">
		<span>或</span>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="auth-form">
		{#if mode === 'register'}
			<div class="form-group">
				<label for="nickname">暱稱</label>
				<input
					id="nickname"
					type="text"
					bind:value={nickname}
					required
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

		<PasswordInput
			id="password"
			bind:value={password}
			label="密碼"
			placeholder={mode === 'register' ? '請輸入密碼（至少 6 個字元）' : '請輸入密碼'}
			disabled={isLoading}
			autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
		/>

		{#if mode === 'register'}
			<PasswordInput
				id="confirmPassword"
				bind:value={confirmPassword}
				label="確認密碼"
				placeholder="請再次輸入密碼以確認"
				disabled={isLoading}
				autocomplete="new-password"
			/>

			<div class="terms-checkbox">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={acceptTerms} disabled={isLoading} required />
					<span class="checkbox-text">
						我已閱讀並同意<a href="/terms" target="_blank" rel="noopener noreferrer">使用者條款</a>
					</span>
				</label>
			</div>
		{/if}

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		{#if successMessage}
			<div class="success-message">{successMessage}</div>
		{/if}

		{#if mode === 'login'}
			<div class="forgot-password-link">
				<a href="/auth/forgot-password">忘記密碼？</a>
			</div>
		{/if}

		<button type="submit" disabled={isLoading} class="submit-btn">
			<span class="btn-content">
				{#if isLoading}
					{loadingText}
				{:else}
					{submitText}
				{/if}
			</span>
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

	/* 移除瀏覽器自動填入時的背景色 */
	input:-webkit-autofill,
	input:-webkit-autofill:hover,
	input:-webkit-autofill:focus,
	input:-webkit-autofill:active {
		-webkit-box-shadow: 0 0 0 30px var(--gradient-antique) inset !important;
		-webkit-text-fill-color: hsl(var(--card-foreground)) !important;
		transition: background-color 5000s ease-in-out 0s;
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
		color: #22c55e;
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: calc(var(--radius));
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		text-align: center;
		font-weight: 500;
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

	.divider {
		position: relative;
		text-align: center;
		margin: 1.5rem 0;
	}

	.divider::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		background: hsl(var(--border));
	}

	.divider span {
		position: relative;
		display: inline-block;
		padding: 0 1rem;
		background: var(--gradient-antique);
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
	}

	.oauth-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.google-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 0.875rem 1rem;
		border: 2px solid hsl(var(--border));
		border-radius: calc(var(--radius));
		background: var(--gradient-antique);
		color: hsl(var(--card-foreground));
		font-size: 1rem;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: hidden;
	}

	.google-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, hsl(0 0% 100%), hsl(0 0% 98%));
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.google-btn:hover {
		border-color: hsl(var(--ring) / 0.3);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.google-btn:hover::before {
		opacity: 1;
	}

	.google-btn:active {
		transform: translateY(1px);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
	}

	.google-btn-content {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.google-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.forgot-password-link {
		text-align: right;
		margin-top: -0.5rem;
	}

	.forgot-password-link a {
		color: hsl(var(--primary));
		text-decoration: none;
		font-size: 0.875rem;
		transition: var(--transition-elegant);
	}

	.forgot-password-link a:hover {
		text-decoration: underline;
		color: hsl(var(--ring));
	}

	.form-footer {
		margin-top: 1.5rem;
		text-align: center;
	}

	.form-footer a {
		color: hsl(var(--primary));
		text-decoration: none;
		font-size: 0.9rem;
		transition: var(--transition-elegant);
	}

	.form-footer a:hover {
		text-decoration: underline;
	}

	.terms-checkbox {
		margin: -0.5rem 0;
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		cursor: pointer;
		font-size: 0.9rem;
		color: hsl(var(--muted-foreground));
	}

	.checkbox-label input[type='checkbox'] {
		margin-top: 0.2rem;
		width: 18px;
		height: 18px;
		cursor: pointer;
		flex-shrink: 0;
	}

	.checkbox-label input[type='checkbox']:disabled {
		cursor: not-allowed;
	}

	.checkbox-text {
		line-height: 1.5;
	}

	.checkbox-text a {
		color: hsl(var(--primary));
		text-decoration: none;
		font-weight: 500;
		transition: var(--transition-elegant);
	}

	.checkbox-text a:hover {
		text-decoration: underline;
		color: hsl(var(--ring));
	}
</style>
