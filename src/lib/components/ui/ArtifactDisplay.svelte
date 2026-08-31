<script lang="ts">
	import VotingChip from '$lib/components/ui/VotingChip.svelte';
	import { chineseNumeral } from '$lib/utils/round';

	interface BeastHead {
		id: number;
		animal: string;
		identifiedIsGenuine?: boolean;
		votes: number;
		voteRank?: number | null; // 投票排名
	}

	interface VotingControls {
		allocations: Record<number, number>;
		remaining: number;
		playerColorCode: string;
		locked: boolean;
		onAdjust: (beastId: number, difference: number) => void;
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
		autoCollapse?: boolean; // 是否自動收起
		// 鑑定階段相關
		showIdentifyHint?: boolean; // 是否顯示鑑定提示
		remainingIdentifyCount?: number; // 剩餘鑑定次數
		hasIdentifySkill?: boolean; // 是否有鑑定技能
		votingControls?: VotingControls;
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
		currentRound = 1,
		autoCollapse = false,
		showIdentifyHint = false,
		remainingIdentifyCount = 0,
		hasIdentifySkill = true,
		votingControls
	}: Props = $props();

	// 收起/展開狀態
	let isCollapsed = $state(false);

	// 獸首區域的 DOM 引用
	let beastHeadsSectionElement: HTMLDivElement | null = null;

	// 當 autoCollapse 變化時，自動設置收起狀態
	$effect(() => {
		if (autoCollapse) {
			isCollapsed = true;
		} else {
			isCollapsed = false;
		}
	});

	// 當進入鑑定階段時，自動滾動到獸首區域
	$effect(() => {
		if (showIdentifyHint && beastHeadsSectionElement) {
			// 延遲一小段時間確保 DOM 已經渲染完成
			setTimeout(() => {
				beastHeadsSectionElement?.scrollIntoView({
					behavior: 'smooth',
					block: 'start'
				});
			}, 100);
		}
	});

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}

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
		return false;
	}
</script>

<div
	class="beast-heads-section"
	class:collapsed={isCollapsed}
	class:voting-mode={Boolean(votingControls)}
	bind:this={beastHeadsSectionElement}
>
	<div class="section-header">
		<div class="spacer"></div>
		<h3 class="section-title">第{chineseNumeral(currentRound)}回合</h3>
		<button
			class="toggle-button"
			onclick={toggleCollapse}
			aria-label={isCollapsed ? '展開獸首' : '收起獸首'}
		>
			{isCollapsed ? '▼' : '▲'}
		</button>
	</div>
	{#if !isCollapsed}
		<div class="beast-heads-grid">
			{#each beastHeads as beast (beast.id)}
				<!-- role and tabindex change together outside voting mode. -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="beast-card"
					class:revealed={identifiedArtifacts.includes(beast.id)}
					class:failed={failedIdentifications.includes(beast.id)}
					class:locked={blockedArtifacts.includes(beast.id)}
					class:selected={selectedBeastHead === beast.id}
					class:interactive={isInteractive(beast.id)}
					class:voting={Boolean(votingControls)}
					class:top-ranked={showVotingResults && (beast.voteRank === 1 || beast.voteRank === 2)}
					onclick={votingControls ? undefined : () => handleBeastClick(beast.id)}
					onkeydown={votingControls ? undefined : (e) => handleKeydown(e, beast.id)}
					role={votingControls ? undefined : 'button'}
					tabindex={votingControls ? undefined : isInteractive(beast.id) ? 0 : -1}
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
							<div class="beast-status" class:is-real={beast.identifiedIsGenuine}>
								{beast.identifiedIsGenuine ? '真品' : '贗品'}
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
						{#if votingControls}
							<div class="card-voting-controls">
								<div class="voting-chip-preview">
									<VotingChip
										colorCode={votingControls.playerColorCode}
										layers={votingControls.allocations[beast.id] ?? 0}
										muted={(votingControls.allocations[beast.id] ?? 0) === 0}
									/>
								</div>
								<div class="chip-stepper">
									<button
										type="button"
										aria-label={`減少投給${beast.animal}首的籌碼`}
										disabled={votingControls.locked ||
											(votingControls.allocations[beast.id] ?? 0) === 0}
										onclick={(event) => {
											event.stopPropagation();
											votingControls.onAdjust(beast.id, -1);
										}}>−</button
									>
									<output aria-live="polite">{votingControls.allocations[beast.id] ?? 0} 枚</output>
									<button
										type="button"
										aria-label={`增加投給${beast.animal}首的籌碼`}
										disabled={votingControls.locked || votingControls.remaining === 0}
										onclick={(event) => {
											event.stopPropagation();
											votingControls.onAdjust(beast.id, 1);
										}}>＋</button
									>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		{#if showIdentifyHint}
			<div class="identify-hint-section">
				{#if hasIdentifySkill}
					<div class="identify-hint-content">
						<div class="hint-icon">🔍</div>
						<p class="hint-text">點擊上方的獸首進行鑑定</p>
						{#if remainingIdentifyCount > 0}
							<div class="remaining-badge">
								<span class="badge-label">剩餘鑑定次數</span>
								<span class="badge-count">{remainingIdentifyCount}</span>
							</div>
						{:else}
							<div class="completed-badge">
								<span>✓</span>
								<span>已用完所有鑑定次數</span>
							</div>
						{/if}
					</div>
				{:else}
					<div class="no-skill-hint">
						<div class="no-skill-icon">⊘</div>
						<p class="no-skill-text">你的角色無法鑑定獸首</p>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.beast-heads-section {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		padding: 0.75rem 1rem;
		backdrop-filter: blur(10px);
		transition: padding 0.2s ease;
	}

	.beast-heads-section.voting-mode {
		padding: 0.75rem 1rem 1rem;
		border-color: rgba(191, 156, 77, 0.42);
		background:
			radial-gradient(circle at 12% 0%, rgba(177, 119, 72, 0.13), transparent 32%),
			rgba(31, 30, 28, 0.88);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 18px 42px rgba(16, 12, 8, 0.18);
	}

	.beast-heads-section.collapsed {
		padding: 0.5rem 0.75rem;
	}

	.section-header {
		display: grid;
		grid-template-columns: 2rem 1fr 2rem;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0;
	}

	.spacer {
		width: 2rem;
	}

	.section-title {
		color: hsl(var(--foreground));
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		text-align: center;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.toggle-button {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 6px;
		color: hsl(var(--foreground));
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		flex-shrink: 0;
	}

	.toggle-button:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(212, 175, 55, 0.5);
		transform: translateY(-1px);
	}

	.toggle-button:active {
		transform: translateY(0);
	}

	.beast-heads-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-top: 1rem;
	}

	.beast-card {
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.3s ease;
		position: relative;
	}

	.beast-card.voting {
		padding: 1.25rem 1rem 1rem;
		border-color: rgba(208, 197, 177, 0.28);
		background: linear-gradient(165deg, rgba(255, 255, 255, 0.075), rgba(40, 38, 35, 0.2));
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
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

	.card-voting-controls {
		width: 100%;
		margin-top: 0.375rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(226, 211, 184, 0.16);
	}

	.voting-chip-preview {
		height: 3.25rem;
		margin: 0 auto -0.125rem;
		text-align: center;
	}

	.chip-stepper {
		display: grid;
		grid-template-columns: 2.5rem minmax(3.5rem, 1fr) 2.5rem;
		align-items: center;
		gap: 0.375rem;
	}

	.chip-stepper button {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 1px solid rgba(218, 202, 174, 0.42);
		border-radius: 0.625rem;
		background: rgba(225, 216, 200, 0.12);
		color: #f2eadc;
		font: inherit;
		font-size: 1.45rem;
		font-weight: 500;
		cursor: pointer;
		touch-action: manipulation;
		transition:
			transform 180ms ease,
			background 180ms ease,
			border-color 180ms ease;
	}

	.chip-stepper button:hover:not(:disabled) {
		transform: translateY(-1px);
		border-color: rgba(214, 176, 89, 0.82);
		background: rgba(191, 156, 77, 0.2);
	}

	.chip-stepper button:active:not(:disabled) {
		transform: translateY(1px) scale(0.97);
	}

	.chip-stepper button:focus-visible {
		outline: 3px solid hsl(var(--ring) / 0.55);
		outline-offset: 2px;
	}

	.chip-stepper button:disabled {
		opacity: 0.26;
		cursor: not-allowed;
	}

	.chip-stepper output {
		color: #f2eadc;
		font-size: 0.875rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}

	/* 鑑定提示區域 */
	.identify-hint-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.identify-hint-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
	}

	.hint-icon {
		font-size: 2rem;
		animation: hint-pulse 2s ease-in-out infinite;
	}

	@keyframes hint-pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.8;
		}
	}

	.hint-text {
		color: hsl(var(--foreground));
		text-align: center;
		font-size: 0.9375rem;
		font-weight: 500;
		margin: 0;
	}

	.remaining-badge {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1.25rem;
		background: rgba(34, 197, 94, 0.15);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: 8px;
	}

	.badge-label {
		color: #22c55e;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.badge-count {
		color: #22c55e;
		font-size: 1.125rem;
		font-weight: 700;
	}

	.completed-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.25rem;
		background: rgba(100, 100, 100, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		font-weight: 500;
	}

	.no-skill-hint {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
	}

	.no-skill-icon {
		font-size: 2rem;
		color: hsl(var(--muted-foreground));
		opacity: 0.5;
	}

	.no-skill-text {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0;
		text-align: center;
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

		.beast-card.voting {
			padding-inline: 0.625rem;
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

		.chip-stepper {
			grid-template-columns: 2.25rem minmax(2.75rem, 1fr) 2.25rem;
			gap: 0.25rem;
		}

		.chip-stepper button {
			width: 2.25rem;
			height: 2.25rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chip-stepper button {
			transition: none;
		}
	}
</style>
