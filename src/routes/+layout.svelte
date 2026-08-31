<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import GTM from '$lib/components/GTM.svelte';
	import PWAPrompt from '$lib/components/PWAPrompt.svelte';
	import type { Snippet } from 'svelte';
	import '../app.css';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	const SITE_NAME = '古董局中局';
	const SITE_URL = 'https://moa.sportify.tw';
	const SOCIAL_IMAGE_URL = `${SITE_URL}/screenshot-desktop.png`;
	const INDEXABLE_PATHS = new Set(['/', '/terms']);
	const websiteSchema = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_NAME,
		alternateName: ['古董局中局非官方APP', 'moa.sportify.tw'],
		url: `${SITE_URL}/`,
		description:
			'古董局中局非官方APP，免費線上桌遊輔助工具，無需下載應用程式，打開瀏覽器即可開始遊戲',
		inLanguage: 'zh-TW'
	});

	let title = $derived(page.data.title || '古董局中局非官方APP｜免費線上桌遊輔助工具');
	let description = $derived(
		page.data.description ||
			'古董局中局非官方APP，免費線上桌遊輔助工具，無需下載應用程式，打開瀏覽器即可開始遊戲'
	);
	let canonicalUrl = $derived(new URL(page.url.pathname, `${SITE_URL}/`).toString());
	let robots = $derived(
		INDEXABLE_PATHS.has(page.url.pathname) ? 'index, follow' : 'noindex, nofollow'
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="application-name" content={SITE_NAME} />
	<meta name="robots" content={robots} />
	<link rel="canonical" href={canonicalUrl} />
	{#if page.data.keywords}
		<meta name="keywords" content={page.data.keywords} />
	{/if}

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="zh_TW" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:image" content={SOCIAL_IMAGE_URL} />
	<meta property="og:image:width" content="1920" />
	<meta property="og:image:height" content="1080" />
	<meta property="og:image:alt" content="古董局中局線上桌遊輔助工具" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={SOCIAL_IMAGE_URL} />
	<meta name="twitter:image:alt" content="古董局中局線上桌遊輔助工具" />

	{#if page.url.pathname === '/'}
		<svelte:element this={'script'} type="application/ld+json">{websiteSchema}</svelte:element>
	{/if}
</svelte:head>

<GTM gtmId={data?.gtmId || ''} />

<div class="layout">
	<div class="background-blur"></div>
	{@render children?.()}
</div>

{#if browser}
	<PWAPrompt />
{/if}

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
