<script lang="ts">
	import { navigating } from '$app/state';
	import LeaderboardView from '$lib/components/leaderboard/LeaderboardView.svelte';
	import { serializeJsonLd } from '$lib/content/leaderboard-seo';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<svelte:element this={'script'} type="application/ld+json"
		>{serializeJsonLd(data.structuredData)}</svelte:element
	>
</svelte:head>

<LeaderboardView leaderboard={data.leaderboard} loading={!!navigating.to} />
