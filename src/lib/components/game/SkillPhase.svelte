<script lang="ts">
	import type {
		Player,
		SkillActions,
		IdentifiedPlayerResult,
		UsedSkills,
		BeastHead
	} from '$lib/types/game';

	export let players: Player[];
	export let currentUser: { nickname: string } | null;
	export let skillActions: SkillActions | null;
	export let usedSkills: UsedSkills;
	export let remainingSkills: UsedSkills | null;
	export let identifiedPlayers: IdentifiedPlayerResult[];
	export let selectedBeastHead: number | null;
	export let beastHeads: BeastHead[] = [];
	export let attackablePlayers: Player[];
	export let onCheckPlayer: (playerId: number | string) => void;
	export let onBlockArtifact: (beastId: number) => void;
	export let onAttackPlayer: (playerId: number | string) => void;
	export let onSwapArtifact: () => void;
	export let onFinish: () => void;
</script>

<div class="skill-phase">
	{#if skillActions}
		<div class="skills-container">
			<!-- 鑑定玩家 -->
			{#if skillActions.checkPeople > 0}
				<div
					class="skill-card"
					class:skill-completed={remainingSkills && remainingSkills.checkPeople === 0}
				>
					<div class="skill-card-header">
						<div class="skill-icon-wrapper identify">
							<svg
								class="skill-icon-svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
							>
								<circle cx="11" cy="11" r="8" />
								<path d="m21 21-4.35-4.35" />
								<circle cx="11" cy="11" r="3" />
							</svg>
						</div>
						<div class="skill-info">
							<h3 class="skill-title">鑑定玩家</h3>
							<p class="skill-desc">查看一位玩家的陣營身份</p>
						</div>
						{#if usedSkills.checkPeople > 0}
							<div class="skill-status completed">
								<span class="status-icon">✓</span>
								<span class="status-text">已完成</span>
							</div>
						{:else if remainingSkills && remainingSkills.checkPeople > 0}
							<div class="skill-status active">
								<span class="status-icon">⚡</span>
								<span class="status-text">可使用</span>
							</div>
						{/if}
					</div>

					<div class="skill-card-body">
						{#if remainingSkills && remainingSkills.checkPeople > 0}
							<div class="action-section">
								<div class="section-title">
									<span class="title-icon">👥</span>
									<span>選擇目標玩家</span>
								</div>
								<div class="player-selection-grid">
									{#each players as player (player.id)}
										{#if player.nickname !== currentUser?.nickname}
											{@const identified = identifiedPlayers.find(
												(ip) => ip.playerId === player.id
											)}
											{#if identified}
												<div class="player-btn-inline identified">
													<span
														class="player-dot"
														style:background-color={player.colorCode || '#888'}
													></span>
													<span class="player-name">{player.nickname}</span>
													<span
														class="camp-tag"
														class:good={identified.camp === 'good'}
														class:bad={identified.camp === 'bad'}
													>
														{identified.camp === 'good' ? '✓ 好人' : '✗ 壞人'}
													</span>
												</div>
											{:else}
												<button class="player-btn-inline" on:click={() => onCheckPlayer(player.id)}>
													<span
														class="player-dot"
														style:background-color={player.colorCode || '#888'}
													></span>
													<span class="player-name">{player.nickname}</span>
													<span class="select-arrow">→</span>
												</button>
											{/if}
										{/if}
									{/each}
								</div>
							</div>
						{:else if identifiedPlayers.length > 0}
							<div class="result-section">
								<div class="section-title">
									<span class="title-icon">📋</span>
									<span>鑑定結果</span>
								</div>
								<div class="player-selection-grid">
									{#each identifiedPlayers as identified (identified.playerId)}
										{@const player = players.find((p) => p.id === identified.playerId)}
										{#if player}
											<div class="player-btn-inline identified">
												<span class="player-dot" style:background-color={player.colorCode || '#888'}
												></span>
												<span class="player-name">{identified.nickname}</span>
												<span
													class="camp-tag"
													class:good={identified.camp === 'good'}
													class:bad={identified.camp === 'bad'}
												>
													{identified.camp === 'good' ? '✓ 好人' : '✗ 壞人'}
												</span>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{:else}
							<div class="empty-state">
								<span class="empty-icon">✓</span>
								<p>本回合技能已使用</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- 封鎖獸首 -->
			{#if skillActions.block > 0}
				<div
					class="skill-card"
					class:skill-completed={remainingSkills && remainingSkills.block === 0}
				>
					<div class="skill-card-header">
						<div class="skill-icon-wrapper block">
							<svg
								class="skill-icon-svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
							>
								<rect x="5" y="11" width="14" height="10" rx="2" />
								<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								<circle cx="12" cy="16" r="1" />
							</svg>
						</div>
						<div class="skill-info">
							<h3 class="skill-title">封鎖獸首</h3>
							<p class="skill-desc">阻止其他玩家獲取特定獸首</p>
						</div>
						{#if usedSkills.block > 0}
							<div class="skill-status completed">
								<span class="status-icon">✓</span>
								<span class="status-text">已完成</span>
							</div>
						{:else if remainingSkills && remainingSkills.block > 0}
							<div class="skill-status active">
								<span class="status-icon">⚡</span>
								<span class="status-text">可使用</span>
							</div>
						{/if}
					</div>

					<div class="skill-card-body">
						{#if remainingSkills && remainingSkills.block > 0}
							<div class="action-section">
								<div class="section-title">
									<span class="title-icon">🎯</span>
									<span>選擇要封鎖的獸首</span>
								</div>
								<p class="hint-text">請點擊上方的獸首圖示進行選擇</p>
								<button
									class="action-button primary"
									disabled={selectedBeastHead === null}
									on:click={() => {
										if (selectedBeastHead !== null) {
											onBlockArtifact(selectedBeastHead);
										}
									}}
								>
									{#if selectedBeastHead !== null}
										{@const selectedBeast = beastHeads.find((b) => b.id === selectedBeastHead)}
										<span class="button-icon">🔒</span>
										<span>確認封鎖{selectedBeast?.animal || '獸'}首</span>
									{:else}
										<span class="button-icon">⚠️</span>
										<span>請先選擇獸首</span>
									{/if}
								</button>
							</div>
						{:else}
							<div class="empty-state">
								<span class="empty-icon">✓</span>
								<p>本回合技能已使用</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- 攻擊玩家 -->
			{#if skillActions.attack > 0}
				<div
					class="skill-card"
					class:skill-completed={remainingSkills && remainingSkills.attack === 0}
				>
					<div class="skill-card-header">
						<div class="skill-icon-wrapper attack">
							<svg
								class="skill-icon-svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
							>
								<path d="M14.5 3.5l6 6-7 7-2 2-2-2 7-7-2-2z" />
								<path d="M5.5 13.5l5 5" />
								<path d="M3 21l2-2" />
								<path d="M18 10l-3-3" />
							</svg>
						</div>
						<div class="skill-info">
							<h3 class="skill-title">偷襲玩家</h3>
							<p class="skill-desc">使目標玩家下回合無法行動</p>
						</div>
						{#if usedSkills.attack > 0}
							<div class="skill-status completed">
								<span class="status-icon">✓</span>
								<span class="status-text">已完成</span>
							</div>
						{:else if remainingSkills && remainingSkills.attack > 0}
							<div class="skill-status active">
								<span class="status-icon">⚡</span>
								<span class="status-text">可使用</span>
							</div>
						{/if}
					</div>

					<div class="skill-card-body">
						{#if remainingSkills && remainingSkills.attack > 0}
							<div class="action-section">
								<div class="section-title">
									<span class="title-icon">🎯</span>
									<span>選擇偷襲目標</span>
								</div>
								<div class="player-selection-grid">
									{#each attackablePlayers as player (player.id)}
										<button
											class="player-btn-inline attack-target"
											on:click={() => onAttackPlayer(player.id)}
										>
											<span class="player-dot" style:background-color={player.colorCode || '#888'}
											></span>
											<span class="player-name">{player.nickname}</span>
										</button>
									{/each}
								</div>
							</div>
						{:else}
							<div class="empty-state">
								<span class="empty-icon">✓</span>
								<p>本回合技能已使用</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- 交換真偽 -->
			{#if skillActions.swap > 0}
				<div
					class="skill-card"
					class:skill-completed={remainingSkills && remainingSkills.swap === 0}
				>
					<div class="skill-card-header">
						<div class="skill-icon-wrapper swap">
							<svg
								class="skill-icon-svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
							>
								<path
									d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"
								/>
								<path d="M7 12h10" />
								<path d="M14 9l3 3-3 3" />
								<path d="M10 9L7 12l3 3" />
							</svg>
						</div>
						<div class="skill-info">
							<h3 class="skill-title">交換真偽</h3>
							<p class="skill-desc">交換兩個獸首的真偽屬性</p>
						</div>
						{#if usedSkills.swap > 0}
							<div class="skill-status completed">
								<span class="status-icon">✓</span>
								<span class="status-text">已完成</span>
							</div>
						{:else if remainingSkills && remainingSkills.swap > 0}
							<div class="skill-status active">
								<span class="status-icon">⚡</span>
								<span class="status-text">可使用</span>
							</div>
						{/if}
					</div>

					<div class="skill-card-body">
						{#if remainingSkills && remainingSkills.swap > 0}
							<div class="action-section centered">
								<p class="hint-text">點擊按鈕交換兩個隨機獸首的真偽屬性</p>
								<button class="action-button primary swap" on:click={onSwapArtifact}>
									<span class="button-icon">🔄</span>
									<span>執行交換技能</span>
								</button>
							</div>
						{:else}
							<div class="empty-state">
								<span class="empty-icon">✓</span>
								<p>本回合技能已使用</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- 完成按鈕 -->
		<div class="phase-footer">
			<button class="finish-button" on:click={onFinish}>
				<span>完成技能階段</span>
				<span class="finish-arrow">→</span>
			</button>
		</div>
	{:else}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p class="loading-text">載入技能資訊中...</p>
		</div>
	{/if}
</div>

<style>
	/* ===== 主容器 ===== */
	.skill-phase {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 1rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	/* ===== 技能容器 ===== */
	.skills-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ===== 技能卡片 ===== */
	.skill-card {
		background: rgba(255, 255, 255, 0.03);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		overflow: hidden;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		backdrop-filter: blur(10px);
	}

	.skill-card:hover {
		border-color: rgba(212, 175, 55, 0.4);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
		transform: translateY(-2px);
	}

	.skill-card.skill-completed {
		opacity: 0.7;
		background: rgba(100, 100, 100, 0.05);
		border-color: rgba(148, 163, 184, 0.3);
	}

	.skill-card.skill-completed:hover {
		transform: none;
		box-shadow: none;
	}

	/* ===== 技能卡片標題 ===== */
	.skill-card-header {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 1.5rem;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.05) 0%,
			rgba(255, 255, 255, 0.02) 100%
		);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.skill-icon-wrapper {
		width: 4rem;
		height: 4rem;
		border-radius: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}

	.skill-icon-wrapper::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 1rem;
		padding: 2px;
		background: linear-gradient(135deg, currentColor, transparent);
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		opacity: 0.5;
	}

	.skill-icon-wrapper.identify {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%);
		color: #3b82f6;
	}

	.skill-icon-wrapper.block {
		background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.1) 100%);
		color: #a855f7;
	}

	.skill-icon-wrapper.attack {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%);
		color: #ef4444;
	}

	.skill-icon-wrapper.swap {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%);
		color: #22c55e;
	}

	.skill-icon-svg {
		width: 2.25rem;
		height: 2.25rem;
		stroke-width: 2.5;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
		transition: transform 0.3s ease;
	}

	.skill-card:not(.skill-completed):hover .skill-icon-svg {
		transform: scale(1.1);
	}

	.skill-info {
		flex: 1;
		min-width: 0;
	}

	.skill-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		letter-spacing: -0.01em;
	}

	.skill-desc {
		margin: 0.375rem 0 0 0;
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		line-height: 1.4;
	}

	/* ===== 技能狀態徽章 ===== */
	.skill-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.skill-status.active {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%);
		color: #d4af37;
		border: 1px solid rgba(212, 175, 55, 0.4);
		animation: pulse 2s ease-in-out infinite;
	}

	.skill-status.completed {
		background: rgba(148, 163, 184, 0.15);
		color: #94a3b8;
		border: 1px solid rgba(148, 163, 184, 0.3);
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	.status-icon {
		font-size: 1rem;
	}

	.status-text {
		font-size: 0.8125rem;
	}

	/* ===== 技能卡片內容 ===== */
	.skill-card-body {
		padding: 1.5rem;
	}

	/* ===== 操作區塊 ===== */
	.action-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.action-section.centered {
		align-items: center;
		text-align: center;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.9375rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.title-icon {
		font-size: 1.125rem;
	}

	.hint-text {
		margin: 0;
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		line-height: 1.6;
	}

	/* ===== 玩家選擇網格 ===== */
	.player-selection-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.875rem;
	}

	/* ===== 玩家按鈕（統一設計） ===== */
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
		font-size: 1rem;
		text-align: left;
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

	.player-btn-inline.attack-target:hover {
		border-color: rgba(239, 68, 68, 0.6);
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
	}

	.player-btn-inline.attack-target::before {
		background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.2), transparent);
	}

	.player-btn-inline.identified {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.4);
		cursor: default;
	}

	.player-btn-inline.identified:hover {
		transform: none;
		box-shadow: none;
	}

	.player-btn-inline.identified::before {
		display: none;
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
		font-weight: 500;
		font-size: 0.9375rem;
		color: hsl(var(--foreground));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.select-arrow {
		color: hsl(var(--muted-foreground));
		font-size: 1.125rem;
		opacity: 0.6;
		transition: all 0.2s ease;
		display: inline-block;
		flex-shrink: 0;
	}

	.player-btn-inline:hover .select-arrow {
		opacity: 1;
		transform: translateX(3px);
		color: #d4af37;
	}

	.player-btn-inline.attack-target:hover {
		opacity: 1;
		transform: scale(1.2);
	}

	/* ===== 玩家結果 ===== */
	.camp-tag {
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.camp-tag.good {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
		border: 1px solid rgba(34, 197, 94, 0.4);
	}

	.camp-tag.bad {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.4);
	}

	/* ===== 結果區塊 ===== */
	.result-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ===== 操作按鈕 ===== */
	.action-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		padding: 0.875rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 700;
		font-size: 0.9375rem;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border: none;
		position: relative;
		overflow: hidden;
	}

	.action-button::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}

	.action-button:hover::before {
		transform: translateX(100%);
	}

	.action-button.primary {
		background: linear-gradient(135deg, #d4af37 0%, #f4e5b1 50%, #d4af37 100%);
		color: #1a1a1a;
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
	}

	.action-button.primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(212, 175, 55, 0.5);
	}

	.action-button.primary:active:not(:disabled) {
		transform: translateY(0);
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
	}

	.action-button.swap {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		color: white;
	}

	.button-icon {
		font-size: 1.125rem;
	}

	/* ===== 空狀態 ===== */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		text-align: center;
	}

	.empty-icon {
		font-size: 2.5rem;
		opacity: 0.6;
	}

	.empty-state p {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9375rem;
		font-style: italic;
	}

	/* ===== 完成區域 ===== */
	.phase-footer {
		display: flex;
		justify-content: center;
		padding-top: 1rem;
	}

	.finish-button {
		display: inline-flex;
		align-items: center;
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

	.finish-button::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}

	.finish-button:hover::before {
		transform: translateX(100%);
	}

	.finish-button:hover {
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(212, 175, 55, 0.5);
	}

	.finish-button:active {
		transform: translateY(-1px);
	}

	.finish-arrow {
		font-size: 1.25rem;
		transition: transform 0.3s ease;
	}

	.finish-button:hover .finish-arrow {
		transform: translateX(6px);
	}

	/* ===== 載入狀態 ===== */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		padding: 4rem 2rem;
	}

	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid rgba(212, 175, 55, 0.3);
		border-top-color: #d4af37;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.loading-text {
		margin: 0;
		font-size: 1.125rem;
		color: hsl(var(--foreground));
		font-weight: 600;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	/* ===== 響應式設計 ===== */
	@media (max-width: 768px) {
		.skill-phase {
			padding: 0.5rem;
			gap: 1.5rem;
		}

		.skill-card-header {
			flex-wrap: wrap;
			padding: 1.25rem;
			gap: 1rem;
		}

		.skill-icon-wrapper {
			width: 3.5rem;
			height: 3.5rem;
		}

		.skill-icon-svg {
			width: 2rem;
			height: 2rem;
		}

		.skill-title {
			font-size: 1.125rem;
		}

		.skill-desc {
			font-size: 0.8125rem;
		}

		.skill-card-body {
			padding: 1.25rem;
		}

		.player-selection-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.player-btn-inline {
			padding: 0.75rem 0.875rem;
			gap: 0.5rem;
		}

		.player-dot {
			width: 12px;
			height: 12px;
		}

		.player-name {
			font-size: 0.875rem;
		}

		.select-arrow {
			font-size: 1rem;
		}

		.camp-tag {
			font-size: 0.6875rem;
			padding: 0.2rem 0.5rem;
		}

		.action-button {
			width: 100%;
			padding: 0.875rem 1.25rem;
		}

		.finish-button {
			width: 100%;
			padding: 0.875rem 2rem;
			font-size: 1rem;
			justify-content: center;
		}
	}
</style>
