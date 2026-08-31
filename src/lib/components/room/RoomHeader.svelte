<script lang="ts">
	import UnifiedHeader from '$lib/components/shared/UnifiedHeader.svelte';
	import type { Player } from '$lib/types/game';

	export let roomName: string;
	export let gameStatus: string;
	export let playerCount: number;
	export let maxPlayers: number;
	export let minPlayers: number;
	export let isHost: boolean;
	export let autoAssignRolesAndColors: boolean = false;
	export let onlineVotingEnabled: boolean = false;
	export let allPlayersReady: boolean;
	export let players: Player[] = [];
	export let onStartSelection: () => void;
	export let onStartGame: () => void;
</script>

<UnifiedHeader
	{roomName}
	{gameStatus}
	{playerCount}
	{maxPlayers}
	{minPlayers}
	{isHost}
	{autoAssignRolesAndColors}
	{onlineVotingEnabled}
	{allPlayersReady}
	{players}
	{onStartSelection}
	{onStartGame}
/>
