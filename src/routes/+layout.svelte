<script lang="ts">
	import '../app.css';
	import GTM from '$lib/components/GTM.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<title>{data?.title || 'MOA - 古董局中局線上桌遊'}</title>
	<meta
		name="description"
		content={data?.description ||
			'古董局中局桌遊線上版，無需下載 App 或註冊微信，打開瀏覽器即可開始遊戲。'}
	/>
	{#if data?.keywords}
		<meta name="keywords" content={data.keywords} />
	{/if}

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data?.title || 'MOA - 古董局中局線上桌遊'} />
	<meta property="og:description" content={data?.description || '古董局中局桌遊線上版'} />
	{#if data?.seo?.url}
		<meta property="og:url" content={data.seo.url} />
	{/if}
	{#if data?.seo?.siteName}
		<meta property="og:site_name" content={data.seo.siteName} />
	{/if}

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={data?.title || 'MOA - 古董局中局線上桌遊'} />
	<meta name="twitter:description" content={data?.description || '古董局中局桌遊線上版'} />
</svelte:head>

<GTM gtmId={data?.gtmId || ''} />

<div class="layout">
	<div class="background-blur"></div>
	{@render children?.()}
</div>

<style>
	:global(html) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		overflow-x: hidden;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		width: 100%;
		min-height: 100vh;
		box-sizing: border-box;
		overflow-x: hidden;
		position: relative;
	}

	.layout {
		background-color: hsl(var(--background));
		position: relative;
		min-height: 100vh;
		width: 100%;
		overflow-x: hidden;
	}

	.background-blur {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: url('/background.jpg');
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		filter: blur(12px) brightness(0.7);
		z-index: 0;
		pointer-events: none;
	}
</style>
