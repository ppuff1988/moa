<script lang="ts">
	let email = '';
	let error = '';
	let success = '';
	let isLoading = false;

	async function handleSubmit() {
		if (isLoading) return;

		error = '';
		success = '';

		if (!email) {
			error = '請輸入 Email';
			return;
		}

		isLoading = true;

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			const result = await response.json();

			if (response.ok) {
				success = result.message;
				email = ''; // 清空輸入
			} else {
				error = result.message || '發送失敗，請稍後再試';
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
	<h1>忘記密碼</h1>
	<p class="description">輸入您的 Email，我們將發送密碼重置連結給您</p>

	<form on:submit|preventDefault={handleSubmit} class="auth-form">
		<div class="form-group">
			<label for="email">Email</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				required
				disabled={isLoading}
				autocomplete="email"
				placeholder="請輸入您的 Email"
			/>
		</div>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		{#if success}
			<div class="success-message">{success}</div>
		{/if}

		<button type="submit" disabled={isLoading} class="submit-btn">
			<span class="btn-content">
				{#if isLoading}
					發送中...
				{:else}
					發送重置連結
				{/if}
			</span>
		</button>
	</form>

	<div class="form-footer">
		<a href="/auth/login">返回登入</a>
		<span class="separator">•</span>
		<a href="/auth/register">註冊新帳號</a>
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
		color: hsl(var(--accent));
		background: hsl(var(--accent) / 0.1);
		border: 1px solid hsl(var(--accent) / 0.3);
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
