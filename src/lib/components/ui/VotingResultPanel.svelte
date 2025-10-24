<script lang="ts">
	import { getJWTToken } from '$lib/utils/jwt';
	import { addNotification } from '$lib/stores/notifications';
	import { chineseNumeral } from '$lib/utils/round';
	import SettlementButton from '$lib/components/game/SettlementButton.svelte';

	interface BeastHead {
		id: number;
		animal: string;
		isGenuine: boolean;
		votes: number;
		voteRank?: number | null;
	}

	export let roomName: string;
	export let beastHeads: BeastHead[] = [];
	export let isHost: boolean = false;
	export let currentRound: number = 1;
	export let onNextRound: () => void = () => {};

	// 獲取排名前兩名的獸首
	$: topTwo = beastHeads
		.filter((b) => b.voteRank === 1 || b.voteRank === 2)
		.sort((a, b) => {
			if (a.voteRank !== b.voteRank) {
				return (a.voteRank || 999) - (b.voteRank || 999);
			}
			return 0;
		});

	// 獲取排名徽章
	function getRankBadge(voteRank: number | null | undefined): string {
		if (voteRank === 1) return '🥇'; // 第一名
		if (voteRank === 2) return '🥈'; // 第二名
		return '';
	}

	// 開始下一回合
	const startNextRound = async () => {
		const token = getJWTToken();
		if (!token) return;

		try {
			const nextRound = currentRound + 1;
			const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/start`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ round: nextRound })
			});

			if (response.ok) {
				// 移除本地通知，因為 socket 事件 'round-started' 會通知所有玩家
				onNextRound();
			} else {
				const error = await response.json();
				addNotification(error.message || '開始下一回合失敗', 'error');
			}
		} catch (error) {
			console.error('開始下一回合錯誤:', error);
			addNotification('開始下一回合失敗，請檢查網路連接', 'error');
		}
	};
</script>

<div class="voting-result-panel">
	<div class="result-header">
		<h4 class="result-title">投票結果公布</h4>
		<p class="result-description">本回合投票已完成</p>
	</div>

	<div class="result-content">
		<div class="top-two-results">
			{#each topTwo as beast (beast.id)}
				<div class="result-card" class:second-place={beast.voteRank === 2}>
					<div class="rank-badge-large">{getRankBadge(beast.voteRank)}</div>
					<div class="beast-info">
						<h5 class="beast-name">{beast.animal}首</h5>
						<div class="vote-count">{beast.votes} 票</div>
					</div>
					{#if beast.voteRank === 2}
						<div class="beast-status-large" class:is-real={beast.isGenuine}>
							{beast.isGenuine ? '真品 ✓' : '贗品 ✗'}
						</div>
					{:else}
						<div class="beast-status-pending">待揭曉</div>
					{/if}
				</div>
			{/each}
		</div>

		<!--{#if secondPlace}-->
		<!--	<div class="announcement">-->
		<!--		<div class="announcement-icon">📢</div>-->
		<!--		<p class="announcement-text">-->
		<!--			第二名 <strong>{secondPlace.animal}首</strong> 為-->
		<!--			<strong class:genuine={secondPlace.isGenuine} class:fake={!secondPlace.isGenuine}>-->
		<!--				{secondPlace.isGenuine ? '真品' : '贗品'}-->
		<!--			</strong>-->
		<!--		</p>-->
		<!--	</div>-->
		<!--{/if}-->

		{#if isHost}
			<div class="host-actions">
				{#if currentRound < 3}
					<button class="primary-btn start-round-btn" on:click={startNextRound}>
						開始第{chineseNumeral(currentRound + 1)}回合
					</button>
				{:else}
					<SettlementButton {roomName} {currentRound} {isHost} />
				{/if}
			</div>
		{:else}
			<p class="action-hint">
				{#if currentRound < 3}
					等待房主開始下一回合...
				{:else}
					等待房主進行遊戲結算...
				{/if}
			</p>
		{/if}
	</div>
</div>

<style>
	.voting-result-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
	}

	.result-header {
		text-align: center;
		margin-bottom: 1rem;
	}

	.result-title {
		color: hsl(var(--foreground));
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.result-description {
		color: hsl(var(--muted-foreground));
		font-size: 1rem;
		margin: 0;
	}

	.result-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		align-items: center;
	}

	.top-two-results {
		display: flex;
		gap: 2rem;
		justify-content: center;
		flex-wrap: wrap;
		width: 100%;
		max-width: 800px;
	}

	.result-card {
		flex: 1;
		min-width: 280px;
		max-width: 360px;
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(184, 151, 90, 0.1) 100%);
		border: 3px solid rgba(212, 175, 55, 0.5);
		border-radius: 16px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		transition: var(--transition-elegant);
	}

	.result-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
	}

	.result-card.second-place {
		background: linear-gradient(
			135deg,
			rgba(192, 192, 192, 0.2) 0%,
			rgba(169, 169, 169, 0.15) 100%
		);
		border-color: rgba(192, 192, 192, 0.6);
	}

	.rank-badge-large {
		font-size: 4rem;
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
		animation: bounce 0.6s ease-in-out;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	.beast-info {
		text-align: center;
	}

	.beast-name {
		color: hsl(var(--foreground));
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.vote-count {
		color: hsl(var(--muted-foreground));
		font-size: 1.25rem;
		font-weight: 600;
	}

	.beast-status-large {
		font-size: 1.25rem;
		font-weight: 600;
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		white-space: nowrap;
	}

	.beast-status-large.is-real {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		color: white;
		font-weight: 700;
	}

	.beast-status-large:not(.is-real) {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		color: white;
		font-weight: 700;
	}

	.beast-status-pending {
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.1);
		border: 2px dashed rgba(255, 255, 255, 0.3);
		white-space: nowrap;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.host-actions {
		margin-top: 1rem;
	}

	.primary-btn {
		padding: 1rem 2.5rem;
		border: none;
		border-radius: calc(var(--radius));
		font-weight: 700;
		cursor: pointer;
		transition: var(--transition-elegant);
		font-size: 1.125rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
	}

	.primary-btn:hover:not(:disabled) {
		background: hsl(var(--secondary) / 0.9);
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(212, 175, 55, 0.5);
	}

	.primary-btn:disabled {
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		cursor: not-allowed;
		opacity: 0.5;
	}

	.start-round-btn {
		min-width: 240px;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
		}
		50% {
			box-shadow: 0 8px 24px rgba(212, 175, 55, 0.6);
		}
	}

	.action-hint {
		color: hsl(var(--muted-foreground));
		text-align: center;
		padding: 1.5rem;
		font-size: 1rem;
		margin: 0;
	}

	@media (max-width: 768px) {
		.top-two-results {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 1rem;
		}

		.result-card {
			min-width: unset;
			padding: 1rem;
		}

		.rank-badge-large {
			font-size: 2.5rem;
		}

		.beast-name {
			font-size: 1.25rem;
		}

		.vote-count {
			font-size: 1rem;
		}

		.beast-status-large {
			font-size: 0.875rem;
			padding: 0.5rem 0.75rem;
			white-space: nowrap;
		}

		.beast-status-pending {
			font-size: 0.875rem;
			padding: 0.5rem 0.75rem;
			white-space: nowrap;
		}
	}
</style>
