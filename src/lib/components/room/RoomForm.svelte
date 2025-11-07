<script lang="ts">
	import PasswordInput from '$lib/components/ui/PasswordInput.svelte';

	export let mode: 'create' | 'join' = 'create';
	export let onCancel: () => void;

	let roomName = '';
	let roomPassword = '';
	let error = '';
	let isLoading = false;

	$: title = mode === 'create' ? '創建房間' : '加入房間';
	$: submitText = mode === 'create' ? '創建房間' : '加入房間';
	$: loadingText = mode === 'create' ? '創建中...' : '加入中...';

	async function handleSubmit() {
		if (isLoading) return;

		error = '';

		// 創建模式只需要密碼，加入模式需要房間名稱和密碼
		if (mode === 'join') {
			if (!roomName.trim()) {
				error = '請輸入房間名稱';
				return;
			}

			if (roomName.length < 1) {
				error = '房間名稱至少需要 1 個字元';
				return;
			}
		}

		if (!roomPassword.trim()) {
			error = '請輸入房間密碼';
			return;
		}

		if (roomPassword.length < 3) {
			error = '房間密碼至少需要 3 個字元';
			return;
		}

		isLoading = true;

		try {
			const apiEndpoint = mode === 'create' ? '/api/room/create' : '/api/room/join';
			const body =
				mode === 'create'
					? { password: roomPassword }
					: { roomName: roomName.trim(), password: roomPassword };

			const response = await fetch(apiEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.getItem('jwt_token')}`
				},
				body: JSON.stringify(body)
			});

			if (response.ok) {
				const result = await response.json();

				// 成功後導向房間大廳 - 使用API返回的房間名稱
				const targetRoomName = mode === 'create' ? result.roomName : roomName.trim();
				window.location.href = `/room/${encodeURIComponent(targetRoomName)}/lobby`;
			} else {
				const result = await response.json();
				console.error('API 錯誤回應:', result);
				error = result.message || `${mode === 'create' ? '創建' : '加入'}房間失敗`;
			}
		} catch (err) {
			console.error('請求錯誤:', err);
			error = '網路錯誤，請稍後再試';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="room-form-wrapper">
	<div class="room-form-container">
		<h1>{title}</h1>

		<form on:submit|preventDefault={handleSubmit} class="room-form">
			{#if mode === 'join'}
				<div class="form-group">
					<label for="roomName">房間名稱</label>
					<input
						id="roomName"
						type="text"
						bind:value={roomName}
						required
						disabled={isLoading}
						autocomplete="off"
						placeholder="請輸入要加入的房間名稱"
					/>
				</div>
			{/if}

			<PasswordInput
				id="roomPassword"
				bind:value={roomPassword}
				label="房間密碼"
				placeholder="請輸入房間密碼"
				disabled={isLoading}
				autocomplete="new-password"
			/>

			{#if mode === 'create'}
				<div class="info-message">
					<p>系統將自動為您生成房間名稱</p>
				</div>
			{/if}

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<div class="button-group">
				<button type="submit" disabled={isLoading} class="submit-btn">
					{#if isLoading}
						{loadingText}
					{:else}
						{submitText}
					{/if}
				</button>

				<button type="button" on:click={onCancel} class="cancel-btn" disabled={isLoading}>
					取消
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.room-form-wrapper {
		position: relative;
		z-index: 1;
		padding: 2rem 2.5rem;
		border-radius: calc(var(--radius) * 2);
		box-shadow: var(--shadow-antique);
		background: var(--gradient-antique);
		border: 1px solid hsl(var(--border));
		min-width: 320px;
		max-width: 500px;
		width: 100%;
		margin: 0 2rem;
		transition: var(--transition-elegant);
	}

	.room-form-wrapper:hover {
		box-shadow: var(--gradient-shadow);
		transform: translateY(-2px);
	}

	.room-form-container {
		width: 100%;
		margin: 0 auto;
		padding: 0;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
		color: hsl(var(--card-foreground));
		font-size: 1.8rem;
		font-weight: 600;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.3);
	}

	.room-form {
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

	.info-message {
		background: hsl(var(--muted) / 0.3);
		border: 1px solid hsl(var(--border));
		border-radius: calc(var(--radius));
		padding: 0.75rem 1rem;
		text-align: center;
	}

	.info-message p {
		margin: 0;
		font-size: 0.85rem;
		color: hsl(var(--muted-foreground));
	}

	@keyframes fadeInError {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.button-group {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.submit-btn {
		flex: 1;
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

	.cancel-btn {
		flex: 1;
		padding: 0.875rem 1rem;
		border: 2px solid hsl(var(--border));
		border-radius: calc(var(--radius));
		background: transparent;
		color: hsl(var(--card-foreground));
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
	}

	.cancel-btn:hover:not(:disabled) {
		background: hsl(var(--muted) / 0.1);
		border-color: hsl(var(--border) / 0.8);
		transform: translateY(-1px);
	}

	.cancel-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* 響應式設計 */
	@media (max-width: 480px) {
		.room-form-container {
			padding: 1rem;
		}

		h1 {
			font-size: 1.5rem;
		}

		.button-group {
			flex-direction: column;
		}
	}
</style>
