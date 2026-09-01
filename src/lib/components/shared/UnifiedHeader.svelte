<script lang="ts">
	import HeaderActions from '$lib/components/shared/HeaderActions.svelte';
	import type { Player } from '$lib/types/game';

	// 共用屬性
	export let roomName: string;
	export let gameStatus: string = 'waiting';

	// 遊戲頁面屬性
	export let currentUserNickname: string | undefined = undefined;
	export let currentPlayerRole: string | null = null;
	export let currentPlayerColor: string | null | undefined = undefined;
	export let currentPlayerColorCode: string | undefined = undefined;
	export let teammateInfo: { roleName: string; nickname: string; colorCode: string } | null = null;
	export let onOpenHistory: (() => void) | undefined = undefined;

	// Lobby 頁面屬性
	export let playerCount: number = 0;
	export let maxPlayers: number = 8;
	export let minPlayers: number = 6;
	export let isHost: boolean = false;
	export let autoAssignRolesAndColors: boolean = false;
	export let onlineVotingEnabled: boolean = false;
	export let allPlayersReady: boolean = false;
	export let players: Player[] = [];
	export let onStartSelection: (() => void) | undefined = undefined;
	export let onStartGame: (() => void) | undefined = undefined;

	// 決定顯示模式
	$: isGameMode = currentPlayerRole !== null || currentUserNickname !== undefined;
	$: isLobbyMode = !isGameMode;

	// Lobby 模式的計算
	$: readyCount = players.filter((p) => p.isReady).length;

	const colorNames: Record<string, string> = {
		'#EF4444': '紅',
		'#F97316': '橙',
		'#EAB308': '黃',
		'#22C55E': '綠',
		'#3B82F6': '藍',
		'#A855F7': '紫',
		'#1F2937': '黑',
		'#F3F4F6': '白'
	};

	function formatColorName(name?: string | null, code?: string): string | null {
		const resolvedName = name?.trim() || (code ? colorNames[code.toUpperCase()] : undefined);
		return resolvedName ? `${resolvedName.replace(/色$/, '')}色` : null;
	}

	$: currentColorName = formatColorName(currentPlayerColor, currentPlayerColorCode);
	$: teammateColorName = formatColorName(null, teammateInfo?.colorCode);
</script>

<div class="unified-header">
	<div class="room-info" data-testid="room-info">
		<div class="info-row">
			<!-- 返回首頁按鈕 -->
			<a href="/" class="back-home-btn" title="返回首頁" aria-label="返回首頁">
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
				<!-- 遊戲模式：將玩家名稱、角色與籌碼顏色綁定為清楚的身分群組 -->
				<div class="identity-cluster">
					<section class="identity-card self-identity" aria-label="你的身分">
						<span class="identity-owner">你</span>
						<div class="identity-copy">
							<strong class="identity-name">{currentUserNickname ?? '玩家'}</strong>
							<div class="identity-details">
								{#if currentPlayerRole}
									<span class="identity-role">角色 · {currentPlayerRole}</span>
								{/if}
								{#if currentColorName && currentPlayerColorCode}
									<span class="identity-color" aria-label={`你的籌碼顏色：${currentColorName}`}>
										<span class="color-swatch" style:background-color={currentPlayerColorCode}
										></span>
										{currentColorName}
									</span>
								{/if}
							</div>
						</div>
					</section>

					{#if teammateInfo}
						<div class="team-connector" aria-label="同隊"><span>同隊</span></div>
						<section class="identity-card teammate-identity" aria-label="隊友身分">
							<span class="identity-owner">隊友</span>
							<div class="identity-copy">
								<strong class="identity-name">{teammateInfo.nickname}</strong>
								<div class="identity-details">
									<span class="identity-role">角色 · {teammateInfo.roleName}</span>
									{#if teammateColorName}
										<span class="identity-color" aria-label={`隊友籌碼顏色：${teammateColorName}`}>
											<span class="color-swatch" style:background-color={teammateInfo.colorCode}
											></span>
											{teammateColorName}
										</span>
									{/if}
								</div>
							</div>
						</section>
					{/if}
				</div>
			{:else if isLobbyMode}
				<!-- Lobby 模式：顯示玩家數量和狀態 -->
				<div class="info-section">
					<span class="label">玩家數</span>
					<span class="value player-count">{playerCount}/{maxPlayers}</span>
				</div>

				{#if autoAssignRolesAndColors}
					<div class="mode-badge" title="角色與顏色會在遊戲開始時隨機分派">自動分派</div>
				{/if}
				{#if onlineVotingEnabled}
					<div class="mode-badge voting-mode-badge" title="所有玩家將自行提交投票籌碼">
						線上投票
					</div>
				{/if}

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
		{autoAssignRolesAndColors}
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

	/* 遊戲模式：玩家、角色、籌碼顏色需被讀成同一組資料 */
	.identity-cluster {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.identity-card {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
		padding: 0.425rem 0.625rem;
		border: 1px solid rgba(229, 216, 194, 0.16);
		border-radius: 0.75rem;
		background: rgba(20, 18, 16, 0.2);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
	}

	.self-identity {
		border-color: rgba(214, 188, 118, 0.27);
	}

	.identity-owner {
		display: grid;
		place-items: center;
		min-width: 1.75rem;
		height: 1.75rem;
		padding-inline: 0.375rem;
		border-radius: 0.45rem;
		background: rgba(214, 188, 118, 0.13);
		color: #d6bc76;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	.teammate-identity .identity-owner {
		background: rgba(197, 185, 170, 0.1);
		color: #c5b9aa;
	}

	.identity-copy {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.identity-name {
		overflow: hidden;
		color: #f4eee3;
		font-size: 0.875rem;
		font-weight: 650;
		line-height: 1.15;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.identity-details {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.identity-role,
	.identity-color {
		color: #c5b9aa;
		font-size: 0.6875rem;
		font-weight: 500;
		line-height: 1.2;
		white-space: nowrap;
	}

	.identity-role {
		color: #d6bc76;
	}

	.identity-color {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.color-swatch {
		width: 0.625rem;
		height: 0.625rem;
		border: 1px solid rgba(255, 255, 255, 0.62);
		border-radius: 50%;
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.46),
			0 1px 4px rgba(0, 0, 0, 0.32);
		flex-shrink: 0;
	}

	.team-connector {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: rgba(214, 188, 118, 0.68);
		font-size: 0.625rem;
		font-weight: 650;
		letter-spacing: 0.06em;
		white-space: nowrap;
	}

	.team-connector::before,
	.team-connector::after {
		content: '';
		width: 0.625rem;
		height: 1px;
		background: rgba(214, 188, 118, 0.28);
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

	.mode-badge {
		padding: 0.25rem 0.55rem;
		border: 1px solid rgba(251, 191, 36, 0.45);
		border-radius: 999px;
		background: rgba(251, 191, 36, 0.12);
		color: #fbbf24;
		font-size: 0.75rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.voting-mode-badge {
		border-color: rgba(96, 165, 250, 0.5);
		background: rgba(96, 165, 250, 0.14);
		color: #93c5fd;
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
			gap: 0.5rem; /* 從 0.75rem 縮小到 0.5rem */
			padding: 0.625rem 0.75rem; /* 上下從 0.75rem 縮小到 0.625rem */
		}

		.room-info {
			width: 100%;
		}

		.info-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.35rem; /* 從 0.5rem 縮小到 0.35rem */
			width: 100%;
			padding: 0;
		}

		/* 返回按鈕在移動版變小 */
		.back-home-btn {
			width: 36px;
			height: 36px;
			position: absolute;
			left: 0.75rem;
			top: 0.75rem;
			z-index: 10;
		}

		.back-home-btn svg {
			width: 18px;
			height: 18px;
		}

		/* 房間號碼區塊在移動版調整 padding，為按鈕留空間 */
		.room-id-section {
			padding-right: 3.25rem; /* 修正：與左邊 padding-left 一致，保持左右對稱 */
			padding-bottom: 0.5rem; /* 從 0.75rem 縮小到 0.5rem */
			padding-left: 3.25rem;
			padding-top: 0.25rem;
			border-right: none;
			border-bottom: 1px solid rgba(255, 255, 255, 0.2);
			width: 100%;
			box-sizing: border-box;
			margin-bottom: 0.5rem; /* 從 0.75rem 縮小到 0.5rem */
			min-height: 2.5rem;
			display: flex;
			align-items: center;
		}

		.room-number {
			font-size: 1.375rem;
		}

		.info-section {
			width: 100%;
			padding: 0.3rem 0; /* 從 0.5rem 縮小到 0.3rem */
		}

		.status-section {
			padding-left: 0;
			padding-top: 0.4rem; /* 從 0.625rem 縮小到 0.4rem */
			padding-bottom: 0.1rem; /* 從 0.125rem 縮小到 0.1rem */
			border-left: none;
			border-top: 1px solid rgba(239, 68, 68, 0.3);
			width: 100%;
			box-sizing: border-box;
			margin-top: 0.3rem; /* 從 0.5rem 縮小到 0.3rem */
		}

		.status-section {
			border-top-color: rgba(96, 165, 250, 0.3);
		}

		.identity-cluster {
			display: grid;
			grid-template-columns: 1fr;
			width: 100%;
			gap: 0.375rem;
		}

		.identity-card {
			width: 100%;
		}

		.team-connector {
			display: none;
		}
	}
</style>
