<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let isOpen = false;
	export let title = '';
	export let onClose: (() => void) | null = null;

	let modalContainer: HTMLDivElement | null = null;
	let portalTarget: HTMLElement | null = null;

	function handleClose() {
		if (onClose) {
			onClose();
		} else {
			isOpen = false;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	onMount(() => {
		// 創建一個 portal target 在 body 的最外層
		portalTarget = document.createElement('div');
		portalTarget.id = 'modal-portal';
		portalTarget.style.cssText =
			'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;';
		document.body.appendChild(portalTarget);
	});

	onDestroy(() => {
		// 清理 portal target
		if (portalTarget && document.body.contains(portalTarget)) {
			document.body.removeChild(portalTarget);
		}
	});

	$: if (portalTarget && modalContainer) {
		if (isOpen) {
			portalTarget.appendChild(modalContainer);
		} else if (modalContainer.parentElement === portalTarget) {
			portalTarget.removeChild(modalContainer);
		}
	}
</script>

<div bind:this={modalContainer} style="display: {isOpen ? 'block' : 'none'};">
	{#if isOpen}
		<div
			class="modal-backdrop"
			role="button"
			tabindex="0"
			on:click={handleBackdropClick}
			on:keydown={(e) => e.key === 'Escape' && handleClose()}
		>
			<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
				<div class="modal-header">
					<h2 id="modal-title" class="modal-title">{title}</h2>
					<button class="close-button" on:click={handleClose} aria-label="關閉">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
				<div class="modal-body">
					<slot />
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 10000;
		animation: fadeIn 0.2s ease-out;
		padding: 0;
		box-sizing: border-box;
		pointer-events: auto;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-content {
		background: linear-gradient(135deg, #2d1810 0%, #1a0f0a 100%);
		border: 2px solid #d4af37;
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(212, 175, 55, 0.3);
		max-width: 500px;
		width: calc(100% - 2rem);
		max-height: calc(100vh - 2rem);
		overflow: hidden;
		animation: slideIn 0.3s ease-out;
		display: flex;
		flex-direction: column;
		margin: auto;
	}

	@keyframes slideIn {
		from {
			transform: translateY(-50px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 1.75rem;
		border-bottom: 2px solid rgba(212, 175, 55, 0.3);
		background: linear-gradient(90deg, rgba(212, 175, 55, 0.12) 0%, transparent 100%);
		flex-shrink: 0;
		position: relative;
	}

	.modal-header::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 100%;
		height: 2px;
		background: linear-gradient(90deg, rgba(212, 175, 55, 0.5), transparent);
	}

	.modal-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #d4af37;
		text-shadow:
			0 0 10px rgba(212, 175, 55, 0.5),
			0 2px 4px rgba(0, 0, 0, 0.3);
		letter-spacing: 0.02em;
	}

	.close-button {
		background: rgba(212, 175, 55, 0.1);
		border: 1px solid rgba(212, 175, 55, 0.3);
		color: #d4af37;
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: var(--transition-elegant);
		border-radius: calc(var(--radius) * 0.5);
		width: 36px;
		height: 36px;
	}

	.close-button:hover {
		background: rgba(212, 175, 55, 0.2);
		border-color: rgba(212, 175, 55, 0.6);
		transform: scale(1.1) rotate(90deg);
		box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
	}

	.close-button:active {
		transform: scale(1) rotate(90deg);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.modal-body :global(p) {
		margin: 0 0 0.75rem 0;
		color: #e8d4a0;
		line-height: 1.6;
		font-size: 1.1rem;
	}

	.modal-body :global(.warning-icon) {
		font-size: 4rem;
		text-align: center;
		margin-bottom: 1rem;
	}

	.modal-body :global(.action-buttons) {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
		justify-content: center;
	}

	.modal-body :global(button) {
		padding: 0.75rem 2rem;
		background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%);
		color: #1a0f0a;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 1rem;
	}

	.modal-body :global(button:hover) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
	}

	.modal-body :global(button:active) {
		transform: translateY(0);
	}
</style>
