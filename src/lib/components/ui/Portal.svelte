<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let isOpen: boolean = true;
	export let zIndex: number = 9999;

	let portalTarget: HTMLElement | null = null;
	let portalContent: HTMLDivElement | null = null;

	onMount(() => {
		// 創建 portal target 元素
		portalTarget = document.createElement('div');
		portalTarget.id = `portal-${Math.random().toString(36).substr(2, 9)}`;
		portalTarget.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: ${zIndex};`;
		document.body.appendChild(portalTarget);

		// 如果有內容，立即附加
		if (portalContent && isOpen) {
			portalTarget.appendChild(portalContent);
		}
	});

	onDestroy(() => {
		// 清理 portal target
		if (portalTarget && document.body.contains(portalTarget)) {
			document.body.removeChild(portalTarget);
		}
	});

	// 響應式處理 isOpen 變化
	$: if (portalTarget && portalContent) {
		if (isOpen && !portalTarget.contains(portalContent)) {
			portalTarget.appendChild(portalContent);
		} else if (!isOpen && portalTarget.contains(portalContent)) {
			portalTarget.removeChild(portalContent);
		}
	}
</script>

<div bind:this={portalContent} style="display: {isOpen ? 'block' : 'none'};">
	<slot />
</div>
