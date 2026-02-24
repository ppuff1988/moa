<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import PasswordInput from '$lib/components/ui/PasswordInput.svelte';

	/** SvelteKit 自動傳入 form action 回傳資料 */
	export let form: { message?: string; email?: string; requiresVerification?: boolean } | null =
		null;

	let email = form?.email ?? '';
	let password = '';
	let isLoading = false;
</script>

<div class="auth-container">
	<h1>登入</h1>

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
				<span>使用 Google 帳號登入</span>
			</span>
		</a>
	</div>

	<div class="divider">
		<span>或</span>
	</div>

	<!--
		登入表單：使用 use:enhance 確保 cookies 正確處理

		關鍵修復：
		1. 使用 use:enhance 攔截表單提交
		2. 登入成功後攔截伺服器的 redirect，改用客戶端 goto()
		3. 先 invalidateAll() 重新載入所有資料（包括 user）
		4. 再 goto() 導航，確保 cookies 已被設定
		5. 這樣避免了原生表單 303 redirect 的 cookie 遺失問題
	-->
	<form
		method="POST"
		class="auth-form"
		use:enhance={() => {
			isLoading = true;
			return async ({ result, update }) => {
				isLoading = false;

				// 登入成功：攔截 redirect，手動處理導航
				if (result.type === 'redirect') {
					console.log('🔄 登入成功，即將導航到首頁...');
					// 重新載入所有 load 函數（包括 layout，確保 user 被更新）
					await invalidateAll();
					// 導航到首頁
					await goto('/', { replaceState: true });
					return;
				}

				// 其他情況（失敗、需要驗證等）：使用預設更新
				await update();
			};
		}}
	>
		<div class="form-group">
			<label for="email">Email</label>
			<input
				id="email"
				name="email"
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
			name="password"
			bind:value={password}
			label="密碼"
			placeholder="請輸入密碼"
			disabled={isLoading}
			autocomplete="current-password"
		/>

		{#if form?.message}
			<div class="error-message">{form.message}</div>
		{/if}

		<div class="forgot-password-link">
			<a href="/auth/forgot-password">忘記密碼？</a>
		</div>

		<button type="submit" disabled={isLoading} class="submit-btn">
			<span class="btn-content">
				{#if isLoading}
					登入中...
				{:else}
					登入
				{/if}
			</span>
		</button>
	</form>

	<div class="form-footer">
		<a href="/auth/register" data-sveltekit-reload>還沒有帳號？點此註冊</a>
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
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-content {
		position: relative;
		z-index: 1;
	}

	.divider {
		display: flex;
		align-items: center;
		text-align: center;
		margin: 1.5rem 0;
		gap: 1rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: hsl(var(--border));
	}

	.divider span {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		flex-shrink: 0;
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
</style>
