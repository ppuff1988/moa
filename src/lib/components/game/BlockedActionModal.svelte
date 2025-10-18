<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';

	export let isOpen = false;
	export let onConfirm: () => void = () => {};

	function handleConfirm() {
		isOpen = false;
		onConfirm();
	}
</script>

<Modal {isOpen} title="⚠️ 無法行動" onClose={handleConfirm}>
	<div class="blocked-content">
		<div class="warning-icon">🚫</div>
		<p class="main-message">你被藥不然攻擊了！</p>
		<p class="sub-message">本回合你無法進行任何操作</p>
		<div class="action-buttons">
			<button on:click={handleConfirm}>我知道了</button>
		</div>
	</div>
</Modal>

<style>
	.blocked-content {
		text-align: center;
	}

	.warning-icon {
		font-size: 5rem;
		margin-bottom: 1rem;
		animation: shake 0.5s ease-in-out;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-10px);
		}
		75% {
			transform: translateX(10px);
		}
	}

	.main-message {
		font-size: 1.5rem;
		font-weight: 700;
		color: #ff6b6b !important;
		margin-bottom: 0.5rem !important;
		text-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
	}

	.sub-message {
		font-size: 1.1rem;
		color: #ffd93d !important;
		margin-bottom: 1.5rem !important;
	}

	.action-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 2rem;
	}

	button {
		padding: 0.75rem 2.5rem;
		background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%);
		color: #1a0f0a;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
	}

	button:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(212, 175, 55, 0.5);
	}

	button:active {
		transform: translateY(0);
	}
</style>
