<script lang="ts">
	import type { Player, SkillActions, IdentifiedPlayerResult, UsedSkills } from '$lib/types/game';

	export let players: Player[];
	export let currentUser: { nickname: string } | null;
	export let skillActions: SkillActions | null;
	export let usedSkills: UsedSkills;
	export let remainingSkills: UsedSkills | null;
	export let identifiedPlayers: IdentifiedPlayerResult[];
	export let selectedBeastHead: number | null;
	export let attackablePlayers: Player[];
	export let onCheckPlayer: (playerId: number | string) => void;
	export let onBlockArtifact: (beastId: number) => void;
	export let onAttackPlayer: (playerId: number | string) => void;
	export let onSwapArtifact: () => void;
	export let onFinish: () => void;
</script>

<div class="skill-phase">
	{#if skillActions}
		<div class="skills-section">
			<!-- 鑑定玩家 -->
			{#if skillActions.checkPeople > 0}
				<div
					class="skill-row"
					class:skill-used={remainingSkills && remainingSkills.checkPeople === 0}
				>
					<div class="skill-header-row">
						<div class="skill-info-left">
							<span class="skill-icon">🔍</span>
							<span class="skill-name">鑑定玩家</span>
							{#if usedSkills.checkPeople > 0}
								<span class="used-badge">已鑑定</span>
							{/if}
						</div>
					</div>
					{#if remainingSkills && remainingSkills.checkPeople > 0}
						<p class="skill-description">選擇一位玩家來查看其陣營</p>
						<div class="player-grid">
							{#each players as player (player.id)}
								{#if player.nickname !== currentUser?.nickname}
									{@const identified = identifiedPlayers.find((ip) => ip.playerId === player.id)}
									{#if identified}
										<div class="player-card identified">
											<div class="player-card-header">
												<span
													class="player-avatar"
													style:background-color={player.colorCode || '#888'}
												></span>
												<span class="player-card-name">{player.nickname}</span>
											</div>
											<div class="player-card-result">
												<span
													class="camp-badge"
													class:camp-good={identified.camp === 'good'}
													class:camp-bad={identified.camp === 'bad'}
												>
													{identified.camp === 'good'
														? '✓ 許愿陣營'
														: identified.camp === 'bad'
															? '✗ 老朝奉陣營'
															: identified.camp}
												</span>
											</div>
										</div>
									{:else}
										<button class="player-card clickable" on:click={() => onCheckPlayer(player.id)}>
											<div class="player-card-header">
												<span
													class="player-avatar"
													style:background-color={player.colorCode || '#888'}
												></span>
												<span class="player-card-name">{player.nickname}</span>
											</div>
											<div class="player-card-action">
												<span class="action-hint">點擊鑑定</span>
												<span class="action-icon">→</span>
											</div>
										</button>
									{/if}
								{/if}
							{/each}
						</div>
					{:else if identifiedPlayers.length > 0}
						<div class="skill-result-summary">
							<p class="result-title">✓ 鑑定結果</p>
							<div class="player-grid">
								{#each identifiedPlayers as identified (identified.playerId)}
									{@const player = players.find((p) => p.id === identified.playerId)}
									{#if player}
										<div class="player-card identified">
											<div class="player-card-header">
												<span
													class="player-avatar"
													style:background-color={player.colorCode || '#888'}
												></span>
												<span class="player-card-name">{identified.nickname}</span>
											</div>
											<div class="player-card-result">
												<span
													class="camp-badge"
													class:camp-good={identified.camp === 'good'}
													class:camp-bad={identified.camp === 'bad'}
												>
													{identified.camp === 'good'
														? '✓ 許愿陣營'
														: identified.camp === 'bad'
															? '✗ 老朝奉陣營'
															: identified.camp}
												</span>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{:else}
						<p class="skill-used-message">✓ 本回合已鑑定</p>
					{/if}
				</div>
			{/if}

			<!-- 封鎖獸首 -->
			{#if skillActions.block > 0}
				<div class="skill-row" class:skill-used={remainingSkills && remainingSkills.block === 0}>
					<div class="skill-header-row">
						<div class="skill-info-left">
							<span class="skill-icon">🔒</span>
							<span class="skill-name">封鎖獸首</span>
							{#if usedSkills.block > 0}
								<span class="used-badge">已封鎖</span>
							{/if}
						</div>
					</div>
					{#if remainingSkills && remainingSkills.block > 0}
						<p class="skill-description">點擊上方的獸首進行封鎖</p>
						<button
							class="confirm-btn"
							disabled={selectedBeastHead === null}
							on:click={() => {
								if (selectedBeastHead !== null) {
									onBlockArtifact(selectedBeastHead);
								}
							}}
						>
							{selectedBeastHead !== null ? '確認封鎖選定的獸首' : '請先選擇一個獸首'}
						</button>
					{:else}
						<p class="skill-used-message">✓ 本回合已使用完畢</p>
					{/if}
				</div>
			{/if}

			<!-- 攻擊玩家 -->
			{#if skillActions.attack > 0}
				<div class="skill-row" class:skill-used={remainingSkills && remainingSkills.attack === 0}>
					<div class="skill-header-row">
						<div class="skill-info-left">
							<span class="skill-icon">⚔️</span>
							<span class="skill-name">偷襲玩家</span>
							{#if usedSkills.attack > 0}
								<span class="used-badge">已攻擊</span>
							{/if}
						</div>
					</div>
					{#if remainingSkills && remainingSkills.attack > 0}
						<p class="skill-description">選擇一位玩家進行偷襲，使其下回合無法行動</p>
						<div class="player-grid">
							{#each attackablePlayers as player (player.id)}
								<button
									class="player-card clickable attack"
									on:click={() => onAttackPlayer(player.id)}
								>
									<div class="player-card-header">
										<span class="player-avatar" style:background-color={player.colorCode || '#888'}
										></span>
										<span class="player-card-name">{player.nickname}</span>
									</div>
									<div class="player-card-action">
										<span class="action-hint">點擊偷襲</span>
										<span class="action-icon attack-icon">⚔️</span>
									</div>
								</button>
							{/each}
						</div>
					{:else}
						<p class="skill-used-message">✓ 本回合已使用完畢</p>
					{/if}
				</div>
			{/if}

			<!-- 交換真偽 -->
			{#if skillActions.swap > 0}
				<div class="skill-row" class:skill-used={remainingSkills && remainingSkills.swap === 0}>
					<div class="skill-header-row">
						<div class="skill-info-left">
							<span class="skill-icon">🔄</span>
							<span class="skill-name">交換真偽</span>
							{#if usedSkills.swap > 0}
								<span class="used-badge">已交換</span>
							{/if}
						</div>
					</div>
					{#if remainingSkills && remainingSkills.swap > 0}
						<button class="confirm-btn" on:click={onSwapArtifact}> 使用交換技能 </button>
					{:else}
						<p class="skill-used-message">✓ 本回合已使用完畢</p>
					{/if}
				</div>
			{/if}
		</div>

		<div class="skills-footer">
			<button class="finish-btn" on:click={onFinish}> 完成技能階段 → </button>
		</div>
	{:else}
		<div class="loading-skills">
			<div class="loading-spinner-small"></div>
			<p>載入技能資訊中...</p>
		</div>
	{/if}
</div>

<style>
	.skill-phase {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.skills-section {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		align-items: center;
		max-width: 100%;
		margin: 0 auto;
	}

	.skill-row {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.skill-row.skill-used {
		opacity: 0.6;
	}

	.skill-header-row {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
	}

	.skill-info-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		justify-content: center;
	}

	.skill-icon {
		font-size: 1.5rem;
	}

	.skill-name {
		font-weight: 600;
		font-size: 1rem;
		color: hsl(var(--foreground));
	}

	.used-badge {
		color: #94a3b8;
		font-weight: 600;
		padding: 0.25rem 0.625rem;
		background: rgba(148, 163, 184, 0.2);
		border-radius: calc(var(--radius) - 2px);
		font-size: 0.8125rem;
		white-space: nowrap;
		border: 1px solid rgba(148, 163, 184, 0.3);
	}

	.skill-used-message {
		color: #94a3b8;
		font-size: 0.875rem;
		font-style: italic;
		margin: 0;
		padding: 0.5rem 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.skill-description {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		margin: 0;
		text-align: center;
		padding: 0 1rem;
	}

	/* 玩家網格佈局 */
	.player-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.75rem;
		padding: 0.5rem 0;
		width: 100%;
	}

	/* 統一的玩家卡片設計 */
	.player-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.player-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.1), transparent);
		transition: left 0.5s ease;
	}

	.player-card.clickable {
		cursor: pointer;
		border: none;
		text-align: left;
	}

	.player-card.clickable:hover::before {
		left: 100%;
	}

	.player-card.clickable:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(212, 175, 55, 0.5);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
	}

	.player-card.clickable.attack:hover {
		border-color: rgba(239, 68, 68, 0.5);
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
	}

	.player-card.identified {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.3);
	}

	.player-card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.player-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: inline-block;
		border: 2px solid rgba(255, 255, 255, 0.4);
		box-shadow: 0 0 10px currentColor;
		flex-shrink: 0;
	}

	.player-card-name {
		font-weight: 600;
		font-size: 0.9375rem;
		color: hsl(var(--foreground));
		flex: 1;
	}

	.player-card-action {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.action-hint {
		font-size: 0.8125rem;
		color: hsl(var(--muted-foreground));
		font-weight: 500;
	}

	.action-icon {
		font-size: 1.125rem;
		color: #d4af37;
		transition: transform 0.2s ease;
	}

	.player-card.clickable:hover .action-icon {
		transform: translateX(3px);
	}

	.attack-icon {
		color: #ef4444;
	}

	.player-card.clickable.attack:hover .attack-icon {
		transform: scale(1.2);
	}

	.player-card-result {
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.camp-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: calc(var(--radius) - 2px);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.camp-badge.camp-good {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
		border: 1px solid rgba(34, 197, 94, 0.4);
	}

	.camp-badge.camp-bad {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.4);
	}

	/* 技能結果總結區 */
	.skill-result-summary {
		width: 100%;
	}

	.result-title {
		color: hsl(var(--foreground));
		font-size: 0.9375rem;
		font-weight: 600;
		text-align: center;
		margin: 0 0 1rem 0;
	}

	.confirm-btn {
		align-self: center;
		padding: 0.5rem 1rem;
		border-radius: calc(var(--radius));
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
		font-size: 0.875rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		border: none;
	}

	.confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
	}

	.confirm-btn:not(:disabled):hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
	}

	.skills-footer {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
	}

	.finish-btn {
		padding: 0.75rem 2rem;
		border-radius: calc(var(--radius));
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
		font-size: 1rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		border: none;
	}

	.finish-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
	}

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

	/* 響應式設計 */
	@media (max-width: 768px) {
		.player-grid {
			grid-template-columns: 1fr;
			gap: 0.625rem;
		}

		.player-card {
			padding: 0.875rem;
		}

		.player-avatar {
			width: 32px;
			height: 32px;
		}

		.player-card-name {
			font-size: 0.875rem;
		}

		.action-hint {
			font-size: 0.75rem;
		}

		.camp-badge {
			font-size: 0.8125rem;
			padding: 0.3125rem 0.625rem;
		}

		.skill-description {
			font-size: 0.8125rem;
		}
	}
</style>
