<script lang="ts">
	import ActionButton from '$lib/components/ui/ActionButton.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { useLeaveRoom } from '$lib/composables/useLeaveRoom';

	export let roomName: string;
	export let gameStatus: string;
	export let playerCount: number = 0;
	export let minPlayers: number = 2;
	export let isHost: boolean = false;
	export let autoAssignRolesAndColors: boolean = false;
	export let allPlayersReady: boolean = false;
	export let onStartSelection: (() => void) | undefined = undefined;
	export let onStartGame: (() => void) | undefined = undefined;
	export let onOpenHistory: (() => void) | undefined = undefined;

	const {
		showLeaveConfirmModal,
		isLeavingRoom,
		handleLeaveRoom,
		handleConfirmLeave,
		closeLeaveConfirmModal
	} = useLeaveRoom();
</script>

<div class="header-actions">
	<!-- 查看行動歷史按鈕（僅在遊戲中顯示） -->
	{#if onOpenHistory && (gameStatus === 'playing' || gameStatus === 'finished')}
		<button class="history-btn" on:click={onOpenHistory}> 📜 查看行動歷史 </button>
	{/if}

	<!-- 離開房間按鈕（waiting 狀態或遊戲結束時顯示） -->
	{#if gameStatus === 'waiting' || gameStatus === 'finished'}
		<ActionButton
			size="compact"
			variant="destructive"
			title="離開房間"
			subtitle=""
			onClick={handleLeaveRoom}
		/>
	{/if}

	<!-- 房主專屬按鈕 -->
	{#if isHost}
		{#if gameStatus === 'waiting' && autoAssignRolesAndColors && onStartGame}
			<ActionButton
				size="compact"
				variant="primary"
				title="開始遊戲"
				subtitle=""
				disabled={playerCount < minPlayers || !allPlayersReady}
				onClick={onStartGame}
			/>
		{:else if gameStatus === 'waiting' && onStartSelection}
			<ActionButton
				size="compact"
				variant="primary"
				title="選擇角色"
				subtitle=""
				disabled={playerCount < minPlayers}
				onClick={onStartSelection}
			/>
		{:else if gameStatus === 'selecting' && onStartGame}
			<ActionButton
				size="compact"
				variant="primary"
				title="開始遊戲"
				subtitle=""
				disabled={!allPlayersReady}
				onClick={onStartGame}
			/>
		{/if}
	{/if}
</div>

<Modal isOpen={$showLeaveConfirmModal} title="確認離開房間" onClose={closeLeaveConfirmModal}>
	<div class="modal-body">
		<p>確定要離開房間嗎？</p>
		<div class="modal-actions">
			<button class="btn btn-cancel" on:click={closeLeaveConfirmModal} disabled={$isLeavingRoom}>
				取消
			</button>
			<button
				class="btn btn-confirm"
				on:click={() => handleConfirmLeave(roomName)}
				disabled={$isLeavingRoom}
			>
				{#if $isLeavingRoom}
					處理中...
				{:else}
					確認離開
				{/if}
			</button>
		</div>
	</div>
</Modal>

<style>
	.header-actions {
		display: flex;
		gap: 0.625rem;
		align-items: center;
		flex-shrink: 0;
	}

	.history-btn {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: calc(var(--radius) * 0.75);
		color: hsl(var(--foreground));
		font-weight: 600;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: var(--transition-elegant);
		display: flex;
		align-items: center;
		gap: 0.375rem;
		white-space: nowrap;
	}

	.history-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.4);
	}

	.modal-body {
		padding: 1.5rem;
		text-align: center;
	}

	.modal-body p {
		margin: 0 0 1.5rem 0;
		font-size: 1rem;
		color: #e8e8e8;
		line-height: 1.6;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 1.5rem;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 100px;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-cancel {
		background-color: #4a4a4a;
		color: #e8e8e8;
	}

	.btn-cancel:hover:not(:disabled) {
		background-color: #5a5a5a;
	}

	.btn-confirm {
		background-color: #d4af37;
		color: #1a0f0a;
	}

	.btn-confirm:hover:not(:disabled) {
		background-color: #e6c547;
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
	}

	@media (max-width: 768px) {
		.header-actions {
			width: 100%;
			flex-wrap: wrap;
			justify-content: stretch;
		}

		.history-btn {
			font-size: 0.75rem;
			padding: 0.5rem 0.875rem;
			flex: 1;
			justify-content: center;
			min-width: 0;
		}
	}
</style>
