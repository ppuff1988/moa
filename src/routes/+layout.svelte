<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import GTM from '$lib/components/GTM.svelte';
	import PWAPrompt from '$lib/components/PWAPrompt.svelte';
	import {
		HOME_DESCRIPTION,
		HOME_TITLE,
		SITE_NAME,
		SITE_URL,
		SOCIAL_IMAGE,
		websiteSchema
	} from '$lib/content/site';
	import type { Snippet } from 'svelte';
	import '../app.css';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	const INDEXABLE_PATHS = new Set(['/', '/terms', '/leaderboard']);
	const INDEXABLE_ROLE_PATH = /^\/leaderboard\/roles\/[1-9]\d*$/;

	let title = $derived(page.data.title || HOME_TITLE);
	let description = $derived(page.data.description || HOME_DESCRIPTION);
	let canonicalUrl = $derived(new URL(page.url.pathname, `${SITE_URL}/`).toString());
	let robots = $derived(
		page.status === 200 &&
			(INDEXABLE_PATHS.has(page.url.pathname) || INDEXABLE_ROLE_PATH.test(page.url.pathname))
			? 'index, follow, max-image-preview:large'
			: 'noindex, nofollow'
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="application-name" content={SITE_NAME} />
	<meta name="robots" content={robots} />
	<link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="zh_TW" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:image" content={SOCIAL_IMAGE.url} />
	<meta property="og:image:type" content="image/jpeg" />
	<meta property="og:image:width" content={String(SOCIAL_IMAGE.width)} />
	<meta property="og:image:height" content={String(SOCIAL_IMAGE.height)} />
	<meta property="og:image:alt" content={SOCIAL_IMAGE.alt} />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={SOCIAL_IMAGE.url} />
	<meta name="twitter:image:alt" content={SOCIAL_IMAGE.alt} />

	{#if page.url.pathname === '/' && page.status === 200}
		<svelte:element this={'script'} type="application/ld+json"
			>{JSON.stringify(websiteSchema)}</svelte:element
		>
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
