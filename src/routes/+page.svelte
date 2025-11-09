<script lang="ts">
	import { useLeaveRoom } from '$lib/composables/useLeaveRoom';
	import RoomForm from '$lib/components/room/RoomForm.svelte';
	import UserArea from '$lib/components/ui/UserArea.svelte';
	import MainTitle from '$lib/components/ui/MainTitle.svelte';
	import ActionButton from '$lib/components/ui/ActionButton.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

	interface User {
		id: number;
		nickname: string;
		email: string;
		avatar?: string | null;
	}

	interface CurrentGame {
		id: string;
		roomName: string;
		status: string;
		playerCount: number;
	}

	interface PageData {
		user: User;
		currentGame: CurrentGame | null;
	}

	export let data: PageData;

	// 使用服務端載入的數據
	let user: User = data.user;
	let currentGame: CurrentGame | null = data.currentGame;
	let showRoomForm = false;
	let roomFormMode: 'create' | 'join' = 'create';

	const {
		showLeaveConfirmModal,
		isLeavingRoom,
		handleLeaveRoom,
		closeLeaveConfirmModal,
		handleConfirmLeave
	} = useLeaveRoom();

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

	function handleProfileUpdate(updatedUser: { nickname: string; avatar: string | null }) {
		if (user) {
			user = {
				...user,
				nickname: updatedUser.nickname,
				avatar: updatedUser.avatar
			};
		}
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
	userId={user.id}
	nickname={user.nickname}
	email={user.email}
	avatar={user.avatar || null}
	onLogout={logout}
	onProfileUpdate={handleProfileUpdate}
/>

<div class="main-content">
	<MainTitle title="古董局中局" subtitle="在這個充滿神秘色彩的古董世界中，運用您的智慧與判斷力" />

	<div class="buttons-section">
		{#if currentGame}
			<!-- 玩家在遊戲中：顯示回到房間和離開房間 -->
			<ActionButton
				variant="primary"
				title="回到房間"
				subtitle="繼續您的遊戲旅程"
				onClick={backToRoom}
			/>
			<ActionButton
				variant="destructive"
				title="離開房間"
				subtitle="退出當前的遊戲房間"
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

	<p class="footer-text">傳承千年智慧，品鑑古董真偽</p>
</div>

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

	.footer-text {
		margin-top: 2rem;
		color: hsl(var(--muted-foreground));
		font-size: 1.1rem;
		font-style: italic;
		opacity: 0.8;
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		max-width: 600px;
	}

	.footer-text::before,
	.footer-text::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			hsl(var(--muted-foreground) / 0.3),
			transparent
		);
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
