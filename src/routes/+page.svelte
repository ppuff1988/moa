<script lang="ts">
	import { onMount } from 'svelte';
	import { getJWTToken } from '$lib/utils/jwt';
	import { useLeaveRoom } from '$lib/composables/useLeaveRoom';
	import RoomForm from '$lib/components/room/RoomForm.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import UserArea from '$lib/components/ui/UserArea.svelte';
	import MainTitle from '$lib/components/ui/MainTitle.svelte';
	import ActionButton from '$lib/components/ui/ActionButton.svelte';
	import FooterDecoration from '$lib/components/ui/FooterDecoration.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

	interface User {
		nickname: string;
		username: string;
		email: string;
		avatar?: string | null;
	}

	interface CurrentGame {
		id: string;
		roomName: string;
		status: string;
		playerCount: number;
	}

	let user: User | null = null;
	let currentGame: CurrentGame | null = null;
	let isLoading = true;
	let showRoomForm = false;
	let roomFormMode: 'create' | 'join' = 'create';

	const {
		showLeaveConfirmModal,
		isLeavingRoom,
		handleLeaveRoom,
		closeLeaveConfirmModal,
		handleConfirmLeave
	} = useLeaveRoom();

	onMount(async () => {
		const token = getJWTToken();
		if (!token) {
			window.location.href = '/auth/login';
			return;
		}

		try {
			// 獲取用戶資料
			const response = await fetch('/api/user/profile', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				user = await response.json();

				// 獲取用戶當前遊戲狀態
				const gameResponse = await fetch('/api/user/current-game', {
					headers: {
						Authorization: `Bearer ${token}`
					}
				});

				if (gameResponse.ok) {
					const gameData = await gameResponse.json();
					if (gameData.hasGame) {
						currentGame = gameData.game;
					}
				}
			} else {
				// Token 無效，清除並重定向
				localStorage.removeItem('jwt_token');
				document.cookie = 'jwt=; path=/; max-age=0';
				window.location.href = '/auth/login';
			}
		} catch (error) {
			console.error('獲取用戶資料錯誤:', error);
			// 發生錯誤時也清除 token
			localStorage.removeItem('jwt_token');
			document.cookie = 'jwt=; path=/; max-age=0';
			window.location.href = '/auth/login';
		} finally {
			isLoading = false;
		}
	});

	function createRoom() {
		roomFormMode = 'create';
		showRoomForm = true;
	}

	function joinRoom() {
		roomFormMode = 'join';
		showRoomForm = true;
	}

	function closeRoomForm() {
		showRoomForm = false;
	}

	async function logout() {
		const { logout } = await import('$lib/utils/jwt');
		await logout();
	}

	function backToRoom() {
		if (!currentGame) return;

		const { roomName, status } = currentGame;
		const basePath = `/room/${encodeURIComponent(roomName)}`;
		window.location.href = ['waiting', 'selection'].includes(status)
			? `${basePath}/lobby`
			: `${basePath}/game`;
	}
</script>

<svelte:head>
	<title>古董局中局 - 傳承千年智慧，品鑑古董真偽</title>
</svelte:head>

{#if isLoading}
	<LoadingSpinner message="載入中..." />
{:else if user}
	{#if showRoomForm}
		<div class="room-form-overlay">
			<RoomForm mode={roomFormMode} onCancel={closeRoomForm} />
		</div>
	{/if}

	<ConfirmModal
		isOpen={$showLeaveConfirmModal}
		title="確認離開房間"
		message="確定要離開房間嗎？"
		confirmText="確認離開"
		cancelText="取消"
		isProcessing={$isLeavingRoom}
		onConfirm={() =>
			handleConfirmLeave(currentGame?.roomName || '', () => {
				currentGame = null;
			})}
		onCancel={closeLeaveConfirmModal}
	/>

	<UserArea
		nickname={user.nickname}
		email={user.email}
		avatar={user.avatar || null}
		onLogout={logout}
	/>

	<div class="main-content">
		<MainTitle title="古董局中局" subtitle="在這個充滿神秘色彩的古董世界中，運用您的智慧與判斷力" />

		<div class="buttons-section">
			{#if currentGame}
				<!-- 玩家在遊戲中：顯示回到房間和離開房間 -->
				<ActionButton variant="primary" title="回到房間" subtitle="" onClick={backToRoom} />
				<ActionButton
					variant="destructive"
					title="離開房間"
					subtitle=""
					onClick={handleLeaveRoom}
				/>
			{:else}
				<!-- 玩家不在遊戲中：顯示創建和加入房間 -->
				<ActionButton
					variant="create"
					title="創建房間"
					subtitle="邀請朋友一起體驗古董鑑賞的樂趣"
					onClick={createRoom}
				/>
				<ActionButton
					variant="join"
					title="加入房間"
					subtitle="加入其他玩家已經創建的遊戲房間"
					onClick={joinRoom}
				/>
			{/if}
		</div>

		<FooterDecoration text="傳承千年智慧，品鑑古董真偽" />
	</div>
{/if}

<style>
	.main-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		text-align: center;
		padding: 2rem;
		position: relative;
		z-index: 1;
	}

	.buttons-section {
		display: flex;
		gap: 4rem;
		margin-bottom: 6rem;
		align-items: flex-start;
	}

	.room-form-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(5px);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 100;
	}

	@media (max-width: 1024px) {
		.buttons-section {
			gap: 2rem;
		}
	}

	@media (max-width: 768px) {
		.main-content {
			padding: 1rem;
			padding-top: 5rem;
		}

		.buttons-section {
			flex-direction: column;
			gap: 3rem;
			align-items: center;
		}
	}
</style>
