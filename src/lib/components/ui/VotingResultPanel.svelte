<script lang="ts">
	import { getJWTToken } from '$lib/utils/jwt';
	import { addNotification } from '$lib/stores/notifications';
	import { chineseNumeral } from '$lib/utils/round';
	import SettlementButton from '$lib/components/game/SettlementButton.svelte';
	import Portal from '$lib/components/ui/Portal.svelte';

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
	export let isOpen: boolean = true;

	// 12生肖排序
	const ZODIAC_ORDER = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];

	// 獲取所有獸首並排序（按票數和生肖順序）
	$: sortedBeasts = beastHeads
		.filter((b) => b.votes >= 0)
		.sort((a, b) => {
			if (b.votes !== a.votes) {
				return b.votes - a.votes;
			}
			// 票數相同時按生肖順序
			const orderA = ZODIAC_ORDER.indexOf(a.animal);
			const orderB = ZODIAC_ORDER.indexOf(b.animal);
			return orderA - orderB;
		});

	// 獲取前兩名（一定會有前兩名，即使第二名是0票）
	$: topTwo = sortedBeasts.slice(0, 2);

	// 獲取排名徽章
	function getRankBadge(beast: BeastHead): string {
		const index = topTwo.findIndex((b) => b.id === beast.id);
		if (index === 0) return '🥇'; // 第一名
		if (index === 1) return '🥈'; // 第二名
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

<Portal {isOpen}>
	<div class="modal-backdrop">
		<div class="modal-dialog">
			<div class="voting-result-panel">
				<div class="result-header">
					<h4 class="result-title">投票結果公布</h4>
					<p class="result-description">本回合投票已完成</p>
				</div>

				<div class="result-content">
					{#if topTwo.length > 0}
						<div class="all-results">
							{#each topTwo as beast, index (beast.id)}
								<div class="result-card" class:top-one={index === 0} class:top-two={index === 1}>
									<div class="rank-badge-large">{getRankBadge(beast)}</div>
									<div class="beast-info">
										<h5 class="beast-name">{beast.animal}首</h5>
										<div class="vote-count">{beast.votes} 票</div>
									</div>
									{#if index === 1}
										<!-- 第二名一定會公布真偽 -->
										<div class="beast-status-large" class:is-real={beast.isGenuine}>
											{beast.isGenuine ? '真品 ✓' : '贗品 ✗'}
										</div>
									{:else if index === 0}
										<div class="beast-status-pending">待揭曉</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="no-votes-message">
							<p>尚未有投票結果</p>
						</div>
					{/if}

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
		</div>
	</div>
</Portal>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 10000;
		animation: fadeIn 0.3s ease-out;
		padding: 1rem;
		box-sizing: border-box;
		pointer-events: auto;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-dialog {
		max-width: 900px;
		width: 100%;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		animation: slideIn 0.4s ease-out;
	}

	@keyframes slideIn {
		from {
			transform: translateY(-50px) scale(0.95);
			opacity: 0;
		}
		to {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
	}

	.voting-result-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 2rem 2.5rem;
		background: linear-gradient(135deg, #2d1810 0%, #1a0f0a 100%);
		border: 3px solid #d4af37;
		border-radius: 20px;
		box-shadow:
			0 20px 60px rgba(212, 175, 55, 0.4),
			0 0 40px rgba(212, 175, 55, 0.2);
	}

	.result-header {
		text-align: center;
		margin-bottom: 0.5rem;
	}

	.result-title {
		color: #d4af37;
		font-size: 1.875rem;
		font-weight: 700;
		margin: 0 0 0.75rem 0;
		text-shadow:
			0 0 20px rgba(212, 175, 55, 0.6),
			0 2px 4px rgba(0, 0, 0, 0.3);
		letter-spacing: 0.05em;
	}

	.result-description {
		color: #e8d4a0;
		font-size: 1rem;
		margin: 0;
	}

	.result-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
		width: 100%;
	}

	.all-results {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1.25rem;
		width: 100%;
		max-width: 900px;
	}

	.no-votes-message {
		text-align: center;
		padding: 2rem;
		color: #e8d4a0;
		font-size: 1.125rem;
	}

	.result-card {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(184, 151, 90, 0.08) 100%);
		border: 2px solid rgba(212, 175, 55, 0.3);
		border-radius: 16px;
		padding: 1.5rem 1.75rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.875rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: all 0.3s ease;
		min-height: 180px;
		justify-content: center;
	}

	.result-card.top-one {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(184, 151, 90, 0.15) 100%);
		border: 3px solid rgba(212, 175, 55, 0.7);
		box-shadow: 0 8px 24px rgba(212, 175, 55, 0.3);
	}

	.result-card.top-two {
		background: linear-gradient(
			135deg,
			rgba(192, 192, 192, 0.25) 0%,
			rgba(169, 169, 169, 0.15) 100%
		);
		border: 3px solid rgba(192, 192, 192, 0.7);
		box-shadow: 0 8px 24px rgba(192, 192, 192, 0.25);
	}

	.result-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
	}

	.rank-badge-large {
		font-size: 3.5rem;
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
		color: #d4af37;
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.vote-count {
		color: #e8d4a0;
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
		color: #e8d4a0;
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.1);
		border: 2px dashed rgba(212, 175, 55, 0.5);
		white-space: nowrap;
	}

	.host-actions {
		margin-top: 1rem;
		display: flex;
		justify-content: center;
	}

	.start-round-btn {
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
		animation: pulse-glow 2s ease-in-out infinite;
	}

	.start-round-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}

	.start-round-btn:hover::before {
		transform: translateX(100%);
	}

	.start-round-btn:hover:not(:disabled) {
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(212, 175, 55, 0.5);
	}

	.start-round-btn:active:not(:disabled) {
		transform: translateY(-1px);
	}

	.start-round-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
		animation: none;
	}

	@keyframes pulse-glow {
		0%,
		100% {
			box-shadow: 0 4px 16px rgba(212, 175, 55, 0.3);
		}
		50% {
			box-shadow: 0 8px 24px rgba(212, 175, 55, 0.6);
		}
	}

	.action-hint {
		color: #e8d4a0;
		text-align: center;
		padding: 1.5rem;
		font-size: 1rem;
		margin: 0;
	}

	@media (max-width: 768px) {
		.modal-dialog {
			max-height: calc(100vh - 1rem);
		}

		.voting-result-panel {
			padding: 1.5rem;
		}

		.result-title {
			font-size: 1.5rem;
		}

		.result-description {
			font-size: 0.9375rem;
		}

		.all-results {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}

		.result-card {
			min-height: 160px;
			padding: 1.25rem;
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

	@media (max-width: 480px) {
		.voting-result-panel {
			padding: 1.25rem;
		}

		.all-results {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.75rem;
		}

		.result-card {
			min-height: 140px;
			padding: 1rem;
		}

		.rank-badge-large {
			font-size: 2rem;
		}

		.beast-name {
			font-size: 1.125rem;
		}

		.vote-count {
			font-size: 0.9375rem;
		}

		.beast-status-large {
			font-size: 0.75rem;
			padding: 0.5rem 0.625rem;
		}

		.beast-status-pending {
			font-size: 0.75rem;
			padding: 0.5rem 0.625rem;
		}
	}
</style>
