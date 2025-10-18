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
	<!--  <div class="skills-header">-->
	<!--    <h4 class="action-subtitle">使用角色技能</h4>-->
	<!--    {#if hasActualSkills}-->
	<!--      <p class="skills-description">選擇並使用你的角色技能，或直接完成此階段</p>-->
	<!--    {:else}-->
	<!--      <p class="skills-description">你的角色沒有可用的技能</p>-->
	<!--    {/if}-->
	<!--  </div>-->

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
						<div class="player-list-inline">
							{#each players as player (player.id)}
								{#if player.nickname !== currentUser?.nickname}
									{@const identified = identifiedPlayers.find((ip) => ip.playerId === player.id)}
									{#if identified}
										<div class="player-btn-inline identified-result">
											<div
												class="player-dot"
												style:background-color={player.colorCode || '#888'}
											></div>
											<div class="player-btn-content">
												<span>{player.nickname}</span>
												<span
													class="player-camp-label"
													class:camp-good={identified.camp === 'good'}
													class:camp-bad={identified.camp === 'bad'}
												>
													{identified.camp === 'good'
														? '許愿陣營'
														: identified.camp === 'bad'
															? '老朝奉陣營'
															: identified.camp}
												</span>
											</div>
										</div>
									{:else}
										<button class="player-btn-inline" on:click={() => onCheckPlayer(player.id)}>
											<span class="player-dot" style:background-color={player.colorCode || '#888'}
											></span>
											<span class="player-btn-content">
												<span>{player.nickname}</span>
											</span>
										</button>
									{/if}
								{/if}
							{/each}
						</div>
					{:else if identifiedPlayers.length > 0}
						<div class="identified-players-list">
							{#each identifiedPlayers as identified (identified.playerId)}
								{@const player = players.find((p) => p.id === identified.playerId)}
								{#if player}
									<div class="identified-player-item">
										<span class="player-dot" style:background-color={player.colorCode || '#888'}
										></span>
										<span class="player-name">{identified.nickname}</span>
										<span
											class="player-camp-badge"
											class:camp-good={identified.camp === 'good'}
											class:camp-bad={identified.camp === 'bad'}
										>
											{identified.camp === 'good'
												? '許愿陣營'
												: identified.camp === 'bad'
													? '老朝奉陣營'
													: identified.camp}
										</span>
									</div>
								{/if}
							{/each}
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
						<p class="skill-instruction">點擊上方的獸首進行封鎖</p>
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
						<div class="player-list-inline">
							{#each attackablePlayers as player (player.id)}
								<button class="player-btn-inline" on:click={() => onAttackPlayer(player.id)}>
									<span class="player-dot" style:background-color={player.colorCode || '#888'}
									></span>
									<span>{player.nickname}</span>
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
		gap: 1rem;
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

	.skill-instruction {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		margin: 0;
		text-align: center;
	}

	.player-list-inline {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: center;
		padding: 0.5rem 0;
	}

	.player-btn-inline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		color: hsl(var(--foreground));
		font-weight: 500;
		cursor: pointer;
		transition: var(--transition-elegant);
	}

	.player-btn-inline:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(212, 175, 55, 0.5);
		transform: translateY(-2px);
	}

	.player-btn-inline.identified-result {
		cursor: default;
		border-color: rgba(34, 197, 94, 0.3);
		background: rgba(34, 197, 94, 0.1);
	}

	.player-btn-inline.identified-result:hover {
		transform: none;
	}

	.player-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid rgba(255, 255, 255, 0.3);
		display: inline-block;
	}

	.player-btn-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-start;
	}

	.player-camp-label {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		border-radius: calc(var(--radius) - 4px);
		font-weight: 600;
	}

	.player-camp-label.camp-good {
		background: rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.player-camp-label.camp-bad {
		background: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.identified-players-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}

	.identified-player-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: calc(var(--radius));
		justify-content: center;
	}

	.player-name {
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.player-camp-badge {
		padding: 0.25rem 0.75rem;
		border-radius: calc(var(--radius) - 2px);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.player-camp-badge.camp-good {
		background: rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.player-camp-badge.camp-bad {
		background: rgba(239, 68, 68, 0.3);
		color: #ef4444;
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
</style>
