<script lang="ts">
	import { chineseNumeral } from '$lib/utils/round';

	interface BeastHead {
		id: number;
		animal: string;
		isGenuine: boolean;
		votes: number;
		voteRank?: number | null; // 投票排名
	}

	interface Props {
		beastHeads: BeastHead[];
		identifiedArtifacts?: number[];
		failedIdentifications?: number[];
		blockedArtifacts?: number[];
		selectedBeastHead?: number | null;
		isMyTurn?: boolean;
		gamePhase?: string;
		canIdentify?: boolean;
		canBlock?: boolean;
		onBeastClick?: (beastId: number) => void;
		showVotingResults?: boolean; // 是否顯示投票結果
		currentRound?: number; // 當前回合數
	}

	let {
		beastHeads,
		identifiedArtifacts = [],
		failedIdentifications = [],
		blockedArtifacts = [],
		selectedBeastHead = null,
		isMyTurn = false,
		gamePhase = '',
		canIdentify = false,
		canBlock = false,
		onBeastClick = () => {},
		showVotingResults = false,
		currentRound = 1
	}: Props = $props();

	// Map zodiac animal names to image numbers (1-12)
	function getZodiacImageNumber(animal: string): number {
		const zodiacMap: Record<string, number> = {
			鼠: 1,
			牛: 2,
			虎: 3,
			兔: 4,
			龍: 5,
			蛇: 6,
			馬: 7,
			羊: 8,
			猴: 9,
			雞: 10,
			狗: 11,
			豬: 12
		};
		return zodiacMap[animal] || 1;
	}

	// Get the zodiac image path
	function getZodiacImagePath(animal: string): string {
		const imageNumber = getZodiacImageNumber(animal);
		return `/zodiac/zodiac_${imageNumber.toString().padStart(2, '0')}.png`;
	}

	// 獲取皇冠圖標
	function getCrownIcon(voteRank: number | null | undefined): string {
		if (voteRank === 1) return '👑'; // 第一名
		if (voteRank === 2) return '🥈'; // 第二名
		return '';
	}

	function handleBeastClick(beastId: number) {
		if (isMyTurn && onBeastClick) {
			onBeastClick(beastId);
		}
	}

	function handleKeydown(e: KeyboardEvent, beastId: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleBeastClick(beastId);
		}
	}

	function isInteractive(beastId: number): boolean {
		if (!isMyTurn) return false;
		if (gamePhase === 'identification' && canIdentify && !blockedArtifacts.includes(beastId))
			return true;
		return gamePhase === 'skill' && canBlock;
	}

	// 判斷是否應該顯示獸首的真偽
	function shouldShowGenuine(beast: BeastHead): boolean {
		// 如果已經被鑑定過，總是顯示
		if (identifiedArtifacts.includes(beast.id)) {
			return true;
		}
		// 如果是投票結果階段，只顯示排名第二的獸首真偽
		if (showVotingResults && beast.voteRank === 2) {
			return true;
		}
		return false;
	}
</script>

<div class="beast-heads-section">
	<h3 class="section-title">第{chineseNumeral(currentRound)}回合獸首</h3>
	<div class="beast-heads-grid">
		{#each beastHeads as beast (beast.id)}
			<div
				class="beast-card"
				class:revealed={identifiedArtifacts.includes(beast.id)}
				class:failed={failedIdentifications.includes(beast.id)}
				class:locked={blockedArtifacts.includes(beast.id)}
				class:selected={selectedBeastHead === beast.id}
				class:interactive={isInteractive(beast.id)}
				class:top-ranked={showVotingResults && (beast.voteRank === 1 || beast.voteRank === 2)}
				onclick={() => handleBeastClick(beast.id)}
				onkeydown={(e) => handleKeydown(e, beast.id)}
				role="button"
				tabindex={isInteractive(beast.id) ? 0 : -1}
			>
				<div class="beast-card-inner">
					{#if showVotingResults && beast.voteRank}
						<div class="crown-badge">{getCrownIcon(beast.voteRank)}</div>
					{/if}
					<div class="beast-icon">
						<img src={getZodiacImagePath(beast.animal)} alt={beast.animal} class="zodiac-image" />
					</div>
					<div class="beast-name">{beast.animal}</div>
					{#if shouldShowGenuine(beast)}
						<div class="beast-status" class:is-real={beast.isGenuine}>
							{beast.isGenuine ? '真品' : '贗品'}
						</div>
					{:else if failedIdentifications.includes(beast.id)}
						<div class="beast-status failed">無法鑑定</div>
					{:else}
						<div class="beast-status unknown">未鑑定</div>
					{/if}
					{#if blockedArtifacts.includes(beast.id)}
						<div class="lock-indicator">🔒</div>
					{/if}
					{#if showVotingResults && beast.votes > 0}
						<div class="vote-count">{beast.votes} 票</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.beast-heads-section {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		padding: 1.5rem;
		backdrop-filter: blur(10px);
	}

	.section-title {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		text-align: center;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.beast-heads-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.beast-card {
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.3s ease;
		position: relative;
	}

	.beast-card.interactive {
		cursor: pointer;
	}

	.beast-card.interactive:hover {
		background: rgba(255, 255, 255, 0.1);
		transform: translateY(-4px);
		border-color: rgba(212, 175, 55, 0.5);
	}

	.beast-card.revealed {
		border-color: rgba(100, 200, 255, 0.5);
	}

	.beast-card.locked {
		opacity: 0.6;
		cursor: not-allowed;
		border-color: rgba(200, 0, 0, 0.5);
	}

	.beast-card.selected {
		border-color: rgba(212, 175, 55, 0.8);
		background: rgba(212, 175, 55, 0.2);
		box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
	}

	.beast-card.failed {
		border-color: rgba(239, 68, 68, 0.5);
		background: rgba(239, 68, 68, 0.15);
	}

	.beast-card.top-ranked {
		border-color: rgba(212, 175, 55, 0.7);
		background: rgba(212, 175, 55, 0.1);
		box-shadow: 0 0 20px rgba(212, 175, 55, 0.25);
	}

	.beast-card-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.crown-badge {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		font-size: 2rem;
		animation: crown-pulse 2s ease-in-out infinite;
		filter: drop-shadow(0 2px 8px rgba(212, 175, 55, 0.6));
	}

	@keyframes crown-pulse {
		0%,
		100% {
			transform: scale(1) rotate(-5deg);
		}
		50% {
			transform: scale(1.1) rotate(5deg);
		}
	}

	.beast-icon {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 80px;
		margin-bottom: 0.5rem;
	}

	.zodiac-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
	}

	.beast-name {
		color: hsl(var(--foreground));
		font-weight: 600;
		font-size: 1rem;
	}

	.beast-status {
		padding: 0.25rem 0.75rem;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.beast-status.is-real {
		background: rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.beast-status.unknown {
		background: rgba(148, 163, 184, 0.3);
		color: #94a3b8;
	}

	.beast-status:not(.is-real):not(.unknown):not(.failed) {
		background: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.beast-status.failed {
		background: rgba(251, 191, 36, 0.3);
		color: #f59e0b;
	}

	.lock-indicator {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		font-size: 1.5rem;
	}

	.vote-count {
		color: rgba(212, 175, 55, 1);
		font-weight: 700;
		font-size: 0.9375rem;
		padding: 0.25rem 0.5rem;
		background: rgba(212, 175, 55, 0.2);
		border-radius: 6px;
		border: 1px solid rgba(212, 175, 55, 0.4);
	}

	@media (max-width: 1024px) {
		.beast-heads-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 768px) {
		.beast-heads-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.75rem;
		}

		.beast-card {
			padding: 1rem;
		}

		.beast-icon {
			font-size: 2rem;
		}

		.beast-name {
			font-size: 0.9rem;
		}

		.crown-badge {
			font-size: 1.5rem;
		}
	}
</style>
