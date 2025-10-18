<script lang="ts">
	export let message: string = '';
	export let type: 'success' | 'info' | 'warning' | 'error' = 'info';
	export let duration: number = 3000;
	export let onClose: () => void;
	export let position: 'top' | 'bottom' = 'bottom';

	let visible = true;

	// 自動關閉
	if (duration > 0) {
		setTimeout(() => {
			visible = false;
			setTimeout(onClose, 300); // 等待動畫完成
		}, duration);
	}

	function handleClose() {
		visible = false;
		setTimeout(onClose, 300);
	}

	$: typeIcon = {
		success: '✓',
		info: 'ℹ',
		warning: '⚠',
		error: '✗'
	}[type];

	$: typeColor = {
		success: '#10B981',
		info: '#3B82F6',
		warning: '#F59E0B',
		error: '#EF4444'
	}[type];
</script>

{#if visible}
	<div
		class="notification-toast"
		class:visible
		class:position-top={position === 'top'}
		class:position-bottom={position === 'bottom'}
		style="--type-color: {typeColor}"
	>
		<div class="toast-icon" style="color: {typeColor}">
			{typeIcon}
		</div>

		<div class="toast-content">
			<p class="toast-message">{message}</p>
		</div>

		<button class="close-btn" on:click={handleClose}> × </button>
	</div>
{/if}

<style>
	.notification-toast {
		min-width: 320px;
		max-width: 400px;
		background: #1f1c19;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		box-shadow: var(--shadow-antique);
		padding: 1rem;
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		transform: translateX(120%);
		opacity: 0;
		transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
	}

	.notification-toast.visible {
		transform: translateX(0);
		opacity: 1;
	}

	.toast-icon {
		font-size: 1.2rem;
		font-weight: bold;
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.toast-content {
		flex: 1;
	}

	.toast-message {
		margin: 0;
		color: white;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: var(--transition-elegant);
		flex-shrink: 0;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	/* 響應式設計 */
	@media (max-width: 768px) {
		.notification-toast {
			min-width: auto;
			max-width: none;
		}
	}
</style>
