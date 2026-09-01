<script lang="ts">
	import UnifiedHeader from '$lib/components/shared/UnifiedHeader.svelte';

	export let roomName: string;
	export let currentUserNickname: string | undefined;
	export let currentPlayerRole: string | null;
	export let currentPlayerColor: string | null | undefined = undefined;
	export let currentPlayerColorCode: string | undefined = undefined;
	export let onOpenHistory: () => void;
	export let teammateInfo: { roleName: string; nickname: string; colorCode: string } | null = null;
	export let gameStatus: string = 'playing';
</script>

<UnifiedHeader
	{roomName}
	{gameStatus}
	{currentUserNickname}
	{currentPlayerRole}
	{currentPlayerColor}
	{currentPlayerColorCode}
	{teammateInfo}
	{onOpenHistory}
/>
