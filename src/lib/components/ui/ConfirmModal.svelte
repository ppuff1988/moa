<script lang="ts">
	import Modal from './Modal.svelte';

	export let isOpen = false;
	export let title = '確認';
	export let message = '';
	export let confirmText = '確認';
	export let cancelText = '取消';
	export let isProcessing = false;
	export let onConfirm: () => void = () => {};
	export let onCancel: () => void = () => {};
</script>

<Modal {isOpen} {title} onClose={onCancel}>
	<div class="modal-body">
		<p class="modal-message">{message}</p>
		<div class="modal-actions">
			<button class="btn btn-cancel" on:click={onCancel} disabled={isProcessing}>
				{cancelText}
			</button>
			<button class="btn btn-confirm" on:click={onConfirm} disabled={isProcessing}>
				{#if isProcessing}
					處理中...
				{:else}
					{confirmText}
				{/if}
			</button>
		</div>
	</div>
</Modal>

<style>
	.modal-body {
		padding: 1rem;
	}

	.modal-message {
		margin-bottom: 1.5rem;
		font-size: 1rem;
		line-height: 1.5;
		color: #333;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.btn {
		padding: 0.5rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-cancel {
		background: #6c757d;
		color: white;
	}

	.btn-cancel:hover:not(:disabled) {
		background: #5a6268;
	}

	.btn-confirm {
		background: #007bff;
		color: white;
	}

	.btn-confirm:hover:not(:disabled) {
		background: #0056b3;
	}
</style>
