<script lang="ts">
	import HeaderActions from '$lib/components/shared/HeaderActions.svelte';
	import type { Player } from '$lib/types/game';

	// 共用屬性
	export let roomName: string;
	export let gameStatus: string = 'waiting';

	// 遊戲頁面屬性
	export let currentUserNickname: string | undefined = undefined;
	export let currentPlayerRole: string | null = null;
	export let teammateInfo: { roleName: string; nickname: string; colorCode: string } | null = null;
	export let onOpenHistory: (() => void) | undefined = undefined;

	// Lobby 頁面屬性
	export let playerCount: number = 0;
	export let maxPlayers: number = 8;
	export let minPlayers: number = 6;
	export let isHost: boolean = false;
	export let allPlayersReady: boolean = false;
	export let players: Player[] = [];
	export let onStartSelection: (() => void) | undefined = undefined;
	export let onStartGame: (() => void) | undefined = undefined;

	// 決定顯示模式
	$: isGameMode = currentPlayerRole !== null || currentUserNickname !== undefined;
	$: isLobbyMode = !isGameMode;

	// Lobby 模式的計算
	$: readyCount = players.filter((p) => p.isReady).length;
</script>

<div class="unified-header">
	<div class="room-info">
		<div class="info-row">
			<!-- 返回首頁按鈕 -->
			<a href="/" class="back-home-btn" title="返回首頁">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
					<polyline points="9 22 9 12 15 12 15 22"></polyline>
				</svg>
			</a>

			<!-- 房間號碼 - 主要資訊 -->
			<div class="room-id-section">
				<span class="label">房間</span>
				<span class="room-number">{roomName}</span>
			</div>

			{#if isGameMode}
				<!-- 遊戲模式：顯示玩家、角色、隊友資訊 -->
				{#if currentUserNickname}
					<div class="info-section">
						<span class="label">玩家</span>
						<span class="value player-name">{currentUserNickname}</span>
					</div>
				{/if}

				{#if currentPlayerRole}
					<div class="info-section">
						<span class="label">角色</span>
						<span class="value role-name">{currentPlayerRole}</span>
					</div>
				{/if}

				{#if teammateInfo}
					<div class="info-section teammate-section">
						<span class="label teammate-label">{teammateInfo.roleName}</span>
						<span class="value teammate-name" style="color: {teammateInfo.colorCode}"
							>{teammateInfo.nickname}</span
						>
					</div>
				{/if}
			{:else if isLobbyMode}
				<!-- Lobby 模式：顯示玩家數量和狀態 -->
				<div class="info-section">
					<span class="label">玩家數</span>
					<span class="value player-count">{playerCount}/{maxPlayers}</span>
				</div>

				{#if gameStatus === 'waiting'}
					<div class="info-section status-section">
						<span class="label">狀態</span>
						{#if playerCount < minPlayers}
							<span class="value status-waiting">還需 {minPlayers - playerCount} 人</span>
						{:else}
							<span class="value status-ready">可以開始</span>
						{/if}
					</div>
				{:else if gameStatus === 'selecting'}
					<div class="info-section status-section">
						<span class="label">選角</span>
						<span class="value status-selecting">{readyCount}/{playerCount} 已選</span>
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<HeaderActions
		{roomName}
		{gameStatus}
		{playerCount}
		{minPlayers}
		{isHost}
		{allPlayersReady}
		{onStartSelection}
		{onStartGame}
		{onOpenHistory}
	/>
</div>

<style>
	.unified-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: calc(var(--radius));
		padding: 1rem 1.25rem;
		backdrop-filter: blur(10px);
		gap: 1rem;
	}

	.room-info {
		flex: 1;
		min-width: 0;
	}

	.info-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
	}

	/* 返回首頁按鈕 */
	.back-home-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.8);
		transition: var(--transition-elegant);
		cursor: pointer;
		text-decoration: none;
		flex-shrink: 0;
	}

	.back-home-btn:hover {
		background: rgba(220, 38, 38, 0.2);
		border-color: #dc2626;
		color: #ef4444;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
	}

	.back-home-btn:active {
		transform: translateY(0);
	}

	/* 房間號碼區塊 - 最突出 */
	.room-id-section {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding-right: 1rem;
		border-right: 2px solid rgba(255, 255, 255, 0.2);
	}

	.room-id-section .label {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.7);
		font-weight: 500;
	}

	.room-number {
		font-size: 1.5rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		letter-spacing: 0.05em;
	}

	/* 資訊區塊 */
	.info-section {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
	}

	.label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.value {
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.3;
	}

	/* 遊戲模式樣式 */
	.player-name {
		color: rgba(255, 255, 255, 0.95);
	}

	.role-name {
		color: #fbbf24;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
		font-weight: 700;
	}

	.teammate-section {
		padding-left: 0.75rem;
		border-left: 2px solid rgba(239, 68, 68, 0.3);
	}

	.teammate-label {
		color: #ef4444;
		font-weight: 700;
		font-size: 0.75rem;
	}

	.teammate-name {
		font-weight: 700;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
		font-size: 0.875rem;
	}

	/* Lobby 模式樣式 */
	.player-count {
		color: #60a5fa;
		font-weight: 700;
	}

	.status-section {
		padding-left: 0.75rem;
		border-left: 2px solid rgba(96, 165, 250, 0.3);
	}

	.status-waiting {
		color: #fbbf24;
	}

	.status-ready {
		color: #22c55e;
		font-weight: 700;
	}

	.status-selecting {
		color: #a855f7;
		font-weight: 700;
	}

	@media (max-width: 1024px) {
		.unified-header {
			padding: 0.875rem 1rem;
		}

		.room-number {
			font-size: 1.25rem;
		}
	}

	@media (max-width: 768px) {
		.unified-header {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
			padding: 0.75rem 1rem;
		}

		.room-info {
			width: 100%;
		}

		.info-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
			width: 100%;
		}

		/* 返回按鈕在移動版變小 */
		.back-home-btn {
			width: 36px;
			height: 36px;
			position: absolute;
			left: 0.75rem;
			top: 0.75rem;
		}

		.back-home-btn svg {
			width: 18px;
			height: 18px;
		}

		/* 房間號碼區塊在移動版調整 padding，為按鈕留空間 */
		.room-id-section {
			padding-right: 0;
			padding-bottom: 0.5rem;
			padding-left: 3rem;
			border-right: none;
			border-bottom: 2px solid rgba(255, 255, 255, 0.2);
			width: 100%;
		}

		.room-number {
			font-size: 1.375rem;
		}

		.info-section {
			width: 100%;
		}

		.teammate-section,
		.status-section {
			padding-left: 0;
			padding-top: 0.5rem;
			border-left: none;
			border-top: 2px solid rgba(239, 68, 68, 0.3);
			width: 100%;
		}

		.status-section {
			border-top-color: rgba(96, 165, 250, 0.3);
		}
	}
</style>
