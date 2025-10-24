<script lang="ts">
	export let id: string;
	export let value: string;
	export let placeholder: string = '請輸入密碼';
	export let disabled: boolean = false;
	export let required: boolean = true;
	export let autocomplete: AutoFill = 'new-password';
	export let label: string = '密碼';
	export let showLabel: boolean = true;
	export let minlength: number | undefined = undefined;

	let showPassword = false;
</script>

{#if showLabel}
	<div class="form-group">
		<label for={id}>{label}</label>
		<div class="password-input-wrapper">
			<input
				{id}
				type={showPassword ? 'text' : 'password'}
				bind:value
				{required}
				{disabled}
				{minlength}
				{autocomplete}
				{placeholder}
			/>
			<button
				type="button"
				class="toggle-password"
				on:click={() => (showPassword = !showPassword)}
				{disabled}
				aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
			>
				{#if showPassword}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
						></path>
						<line x1="1" y1="1" x2="23" y2="23"></line>
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
						<circle cx="12" cy="12" r="3" fill="none"></circle>
					</svg>
				{/if}
			</button>
		</div>
	</div>
{:else}
	<div class="password-input-wrapper">
		<input
			{id}
			type={showPassword ? 'text' : 'password'}
			bind:value
			{required}
			{disabled}
			{minlength}
			{autocomplete}
			{placeholder}
		/>
		<button
			type="button"
			class="toggle-password"
			on:click={() => (showPassword = !showPassword)}
			{disabled}
			aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
		>
			{#if showPassword}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
					></path>
					<line x1="1" y1="1" x2="23" y2="23"></line>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
					<circle cx="12" cy="12" r="3" fill="none"></circle>
				</svg>
			{/if}
		</button>
	</div>
{/if}

<style>
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

	.password-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	input {
		flex: 1;
		padding: 0.75rem 1rem;
		padding-right: 3rem;
		border: 2px solid hsl(var(--border));
		border-radius: calc(var(--radius));
		font-size: 1rem;
		background: var(--gradient-antique);
		color: hsl(var(--card-foreground));
		transition: var(--transition-elegant);
		width: 100%;
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

	.toggle-password {
		position: absolute;
		right: 0.75rem;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: hsl(var(--card-foreground));
		transition: var(--transition-elegant);
		border-radius: 4px;
		opacity: 0.7;
	}

	.toggle-password:hover:not(:disabled) {
		color: hsl(var(--primary));
		opacity: 1;
		background: hsl(var(--muted) / 0.2);
	}

	.toggle-password:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.toggle-password svg {
		filter: drop-shadow(0 1px 2px hsl(var(--background) / 0.3));
	}
</style>
