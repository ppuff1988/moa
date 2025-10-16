<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { useRoomLobby } from '$lib/composables/useRoomLobby';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import RoomHeader from '$lib/components/room/RoomHeader.svelte';
	import PlayersGrid from '$lib/components/player/PlayersGrid.svelte';
	import FooterDecoration from '$lib/components/ui/FooterDecoration.svelte';
	import NotificationManager from '$lib/components/notification/NotificationManager.svelte';

	const minPlayers = 6;
	const maxPlayers = 8;

	// 從 URL 獲取房間名稱
	const roomName = $page.params.name || '';

	// 使用 composable 管理房間邏輯 - 只创建一次
	const roomLobby = useRoomLobby(roomName);
	const { currentUser, players, isLoading, isHost, gameStatus, allPlayersReady } = roomLobby;

	// 計算底部裝飾文字
	$: footerText = $players.length < minPlayers ? '等待更多玩家加入' : '等待房主開始遊戲';

	// 監聽遊戲狀態變化，當不是 waiting 或 selecting 時導向遊戲頁面
	$: if ($gameStatus && $gameStatus !== 'waiting' && $gameStatus !== 'selecting' && !$isLoading) {
		console.log('🎮 遊戲狀態已改變:', $gameStatus, '- 導向遊戲頁面');
		// 使用相對路徑導航到遊戲頁面，避免 URL 編碼問題
		goto(`../game`, { replaceState: true, invalidateAll: true });
	}

	onMount(async () => {
		await roomLobby.initialize();

		// 初始化完成後，檢查遊戲狀態
		const status = $gameStatus;
		if (status && status !== 'waiting' && status !== 'selecting') {
			console.log('🎮 初始化後檢測到遊戲狀態:', status, '- 導向遊戲頁面');
			goto(`../game`, { replaceState: true, invalidateAll: true });
		}
	});

	onDestroy(() => {
		roomLobby.cleanup();
	});
</script>

<svelte:head>
	<title>房間大廳 - {roomName} - 古董局中局</title>
</svelte:head>

{#if $isLoading}
	<LoadingSpinner message="載入房間中..." />
{:else}
	<div class="lobby-container" data-testid="lobby-container">
		<RoomHeader
			{roomName}
			gameStatus={$gameStatus}
			playerCount={$players.length}
			{maxPlayers}
			{minPlayers}
			isHost={$isHost}
			allPlayersReady={$allPlayersReady}
			onLeaveRoom={roomLobby.leaveRoom}
			onStartSelection={roomLobby.startSelection}
			onStartGame={roomLobby.startGame}
		/>

		<PlayersGrid
			players={$players}
			currentUserId={$currentUser?.id}
			isHost={$isHost}
			gameStatus={$gameStatus}
			{roomName}
			onKickPlayer={roomLobby.kickPlayer}
		/>

		<FooterDecoration text={footerText} />
	</div>

	<NotificationManager />
{/if}

<style>
	.lobby-container {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	@media (max-width: 768px) {
		.lobby-container {
			padding: 1rem;
		}
	}
</style>
