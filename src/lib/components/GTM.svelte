<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		gtmId: string;
	}

	let { gtmId }: Props = $props();

	onMount(() => {
		if (!gtmId) return;

		// 初始化 dataLayer
		window.dataLayer = window.dataLayer || [];
		window.dataLayer.push({
			'gtm.start': new Date().getTime(),
			event: 'gtm.js'
		});

		// 載入 GTM script
		const script = document.createElement('script');
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
		document.head.appendChild(script);
	});
</script>

<svelte:head>
	{#if gtmId}
		<!-- Google Tag Manager (noscript) -->
		<noscript>
			<iframe
				src="https://www.googletagmanager.com/ns.html?id={gtmId}"
				height="0"
				width="0"
				style="display:none;visibility:hidden"
				title="Google Tag Manager"
			></iframe>
		</noscript>
	{/if}
</svelte:head>
