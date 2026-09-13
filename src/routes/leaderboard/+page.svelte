<script lang="ts">
	import { navigating } from '$app/state';
	import LeaderboardView from '$lib/components/leaderboard/LeaderboardView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<LeaderboardView leaderboard={data.leaderboard} loading={!!navigating.to} />
