<script lang="ts">
	import HomeLanding from '$lib/components/home/HomeLanding.svelte';
	import RoomForm from '$lib/components/room/RoomForm.svelte';
	import ActionButton from '$lib/components/ui/ActionButton.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import MainTitle from '$lib/components/ui/MainTitle.svelte';
	import UserArea from '$lib/components/ui/UserArea.svelte';
	import { useLeaveRoom } from '$lib/composables/useLeaveRoom';
	import { logout as logoutUser } from '$lib/utils/jwt';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// 使用 writable $derived 模式：允許本地覆寫,同時自動同步伺服器資料
	let userOverride = $state<typeof data.user>(null);
	let currentGameOverride = $state<typeof data.currentGame>(null);

	let user = $derived(userOverride ?? data.user);
	let currentGame = $derived(currentGameOverride ?? data.currentGame);

	$effect(() => {
		console.log('🏠 首頁載入，User:', user ? `${user.email} (已登入)` : '未登入');
		console.log('   Current game:', currentGame);
	});

	let showRoomForm = $state(false);
	let roomFormMode: 'create' | 'join' = $state('create');

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
		// 清除本地覆寫狀態
		userOverride = null;
		currentGameOverride = null;

		// 使用統一的登出函數（會清除 session、JWT 並重定向）
		await logoutUser();
	}

	function handleProfileUpdate(updatedUser: { nickname: string; avatar: string | null }) {
		if (user) {
			userOverride = {
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

	// 防止瀏覽器快取造成的登出後返回問題
	onMount(() => {
		// 監聯 pageshow 事件，檢測頁面是否從快取恢復
		const handlePageShow = (event: PageTransitionEvent) => {
			// 如果頁面是從快取恢復的，強制重新載入以確保 session 狀態正確
			if (event.persisted) {
				window.location.reload();
			}
		};

		window.addEventListener('pageshow', handlePageShow);

		return () => {
			window.removeEventListener('pageshow', handlePageShow);
		};
	});
</script>

{#if showRoomForm}
	<div class="room-form-overlay">
		<RoomForm mode={roomFormMode} onCancel={closeRoomForm} />
	</div>
{/if}

{#if user}
	<!-- 已登入用戶界面 -->
	<ConfirmModal
		isOpen={$showLeaveConfirmModal}
		title="確認離開房間"
		message="確定要離開房間嗎？"
		confirmText="確認離開"
		cancelText="取消"
		isProcessing={$isLeavingRoom}
		onConfirm={() =>
			handleConfirmLeave(currentGame?.roomName || '', () => {
				currentGameOverride = null;
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
{:else}
	<HomeLanding />
{/if}

<style>
	/* 已登入用戶的樣式（保持原有） */
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

	@media (max-width: 768px) {
		.main-content {
			padding: 2rem 1rem;
		}
		.buttons-section {
			flex-direction: column;
			gap: 3rem;
			align-items: center;
		}
	}
</style>
