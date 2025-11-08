<script lang="ts">
	import type { Player } from '$lib/types/game';

	export let players: Player[];
	export let assignablePlayers: Player[];
	export let onAssign: (playerId: number | string) => void;
	export let onEnterDiscussion: () => void;
</script>

<div class="assign-phase">
	{#if players.length === 0}
		<div class="loading-skills">
			<div class="loading-spinner-small"></div>
			<p>載入玩家列表中...</p>
		</div>
	{:else if assignablePlayers.length === 0}
		<div class="no-assignable-section">
			<div class="completion-icon">✓</div>
			<div class="no-assignable-message">
				<p class="no-assignable-text">所有玩家已完成行動</p>
				<p class="no-assignable-subtext">本回合行動階段結束，準備進入討論</p>
			</div>
			<button class="enter-discussion-btn" on:click={onEnterDiscussion}>
				<span>進入討論階段</span>
				<span class="discussion-arrow">→</span>
			</button>
		</div>
	{:else}
		<!-- 指派提示 -->
		<div class="skills-header">
			<h4 class="action-subtitle">指派下一位行動者</h4>
			<p class="skills-description">
				選擇尚未行動的玩家 · 還有 {assignablePlayers.length} 位玩家待指派
			</p>
		</div>

		<!-- 玩家列表 -->
		<div class="player-list-inline">
			{#each assignablePlayers as player (player.id)}
				<button class="player-btn-inline" on:click={() => onAssign(player.id)}>
					<span class="player-dot" style:background-color={player.colorCode || '#888'}></span>
					<span class="player-name">{player.nickname}</span>
					<span class="assign-arrow">→</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.assign-phase {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* 標題區塊 */
	.skills-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.action-subtitle {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		text-align: center;
		margin: 0;
	}

	.skills-description {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		text-align: center;
		margin: 0;
	}

	/* 玩家列表 */
	.player-list-inline {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
		padding: 0.5rem 0;
	}

	.player-btn-inline {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		color: hsl(var(--foreground));
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.player-btn-inline::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent);
		transition: left 0.5s ease;
	}

	.player-btn-inline:hover::before {
		left: 100%;
	}

	.player-btn-inline:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(212, 175, 55, 0.6);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
	}

	.player-btn-inline:active {
		transform: translateY(0);
	}

	.player-dot {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 2px solid rgba(255, 255, 255, 0.4);
		box-shadow: 0 0 8px currentColor;
		display: inline-block;
	}

	.player-name {
		flex: 1;
		text-align: left;
	}

	.assign-arrow {
		color: hsl(var(--muted-foreground));
		font-size: 1.125rem;
		opacity: 0.6;
		transition: all 0.2s ease;
		display: inline-block;
	}

	.player-btn-inline:hover .assign-arrow {
		opacity: 1;
		transform: translateX(3px);
		color: #d4af37;
	}

	/* 載入狀態 */
	.loading-skills {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
	}

	.loading-spinner-small {
		width: 2rem;
		height: 2rem;
		border: 2px solid hsl(var(--muted));
		border-top: 2px solid hsl(var(--primary));
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* 完成狀態 */
	.no-assignable-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
	}

	.completion-icon {
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
		border: 2px solid rgba(34, 197, 94, 0.4);
		border-radius: 50%;
		color: #22c55e;
		animation: scaleIn 0.5s ease;
	}

	@keyframes scaleIn {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		50% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.no-assignable-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.no-assignable-text {
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		margin: 0;
	}

	.no-assignable-subtext {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	/* 按鈕樣式 */
	.enter-discussion-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.875rem;
		padding: 1rem 2.5rem;
		background: linear-gradient(135deg, #d4af37 0%, #f4e5b1 50%, #d4af37 100%);
		color: #1a1a1a;
		border: none;
		border-radius: 0.875rem;
		font-size: 1.0625rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 16px rgba(212, 175, 55, 0.3);
		position: relative;
		overflow: hidden;
	}

	.enter-discussion-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}

	.enter-discussion-btn:hover::before {
		transform: translateX(100%);
	}

	.enter-discussion-btn:hover {
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(212, 175, 55, 0.5);
	}

	.enter-discussion-btn:active {
		transform: translateY(-1px);
	}

	.discussion-arrow {
		font-size: 1.25rem;
		transition: transform 0.3s ease;
	}

	.enter-discussion-btn:hover .discussion-arrow {
		transform: translateX(6px);
	}

	/* 響應式設計 */
	@media (max-width: 768px) {
		.player-list-inline {
			grid-template-columns: repeat(2, 1fr); /* 改為雙欄 */
			gap: 0.5rem; /* 縮小間距以適應雙欄 */
		}

		.player-btn-inline {
			padding: 0.75rem 0.875rem; /* 縮小內邊距以適應雙欄 */
			gap: 0.5rem;
		}

		.player-dot {
			width: 12px;
			height: 12px;
		}

		.player-name {
			font-size: 0.875rem; /* 縮小字體以適應雙欄 */
		}

		.assign-arrow {
			font-size: 1rem;
		}

		.action-subtitle {
			font-size: 1rem;
		}

		.no-assignable-text {
			font-size: 1.125rem;
		}
	}
</style>
