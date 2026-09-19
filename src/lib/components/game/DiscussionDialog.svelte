<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		open,
		title,
		onclose,
		children
	}: { open: boolean; title: string; onclose: () => void; children: Snippet } = $props();
	let dialog: HTMLDialogElement;
	$effect(() => {
		if (open && dialog && !dialog.open) dialog.showModal();
		if (!open && dialog?.open) dialog.close();
	});
</script>

<dialog bind:this={dialog} {onclose} aria-label={title}>
	<header>
		<h3>{title}</h3>
		<button type="button" onclick={() => dialog.close()} aria-label="關閉">✕</button>
	</header>
	<div class="body">{@render children()}</div>
</dialog>

<style>
	dialog {
		position: fixed;
		inset: auto 0 0;
		margin: 0 auto;
		width: min(100%, 540px);
		max-width: 100%;
		max-height: 85dvh;
		padding: 1rem 1rem max(1rem, env(safe-area-inset-bottom));
		border: 1px solid #79633c;
		border-radius: 16px 16px 0 0;
		background: #24221e;
		color: #f5f1e8;
		overflow-y: auto;
	}
	dialog::backdrop {
		background: #000a;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	h3 {
		margin: 0;
		font-size: 1.1rem;
	}
	button {
		min-width: 44px;
		min-height: 44px;
		border: 1px solid #79633c;
		background: transparent;
		color: inherit;
		border-radius: 8px;
		cursor: pointer;
	}
	@media (min-width: 700px) {
		dialog {
			inset: 0;
			margin: auto;
			border-radius: 16px;
		}
	}
</style>
