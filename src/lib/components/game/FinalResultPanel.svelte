<script lang="ts">
	interface Artifact {
		id?: number;
		round?: number;
		voteRank?: number | null;
		isGenuine: boolean;
		animal: string;
	}

	interface Player {
		id: number | string;
		nickname: string;
		roleName?: string | null;
		camp?: string | null;
		colorCode?: string | null;
	}

	interface IdentificationResult {
		success: boolean;
		targetId?: number;
		targetName?: string;
		actualName?: string;
		votes?: number;
		required?: number;
		voteDetails?: Array<{
			voterName: string;
			voterRole: string;
			votedFor: string;
			votedForRole: string;
			voterColorCode: string | null;
			votedColorCode: string | null;
		}>;
	}

	interface IdentificationResults {
		laoChaoFeng?: IdentificationResult;
		xuYuan?: IdentificationResult;
		fangZhen?: IdentificationResult;
	}

	export let winner: string;
	export let xuYuanScore: number;
	export let allArtifacts: Artifact[] = [];
	export let players: Player[] = [];
	export let identificationResults: IdentificationResults | null = null;

	// 控制投票詳情的展開狀態
	let expandedVoteDetails: { [key: string]: boolean } = {
		laoChaoFeng: false,
		xuYuan: false,
		fangZhen: false
	};

	function toggleVoteDetails(key: string) {
		expandedVoteDetails[key] = !expandedVoteDetails[key];
	}

	// 按回合分組獸首
	$: artifactsByRound = [1, 2, 3].map((round) => {
		return allArtifacts.filter((a) => a.round === round);
	});

	// 計算每回合的真品數
	$: genuineCountByRound = artifactsByRound.map((artifacts) => {
		const topTwo = artifacts.filter((a) => a.voteRank === 1 || a.voteRank === 2);
		return topTwo.filter((a) => a.isGenuine).length;
	});

	// 獲取排名徽章
	function getRankBadge(voteRank: number | null | undefined): string {
		if (voteRank === 1) return '🥇';
		if (voteRank === 2) return '🥈';
		return '';
	}

	// 按陣營分組玩家
	$: xuYuanPlayers = players.filter((p) => p.camp === 'good');
	$: laoChaoFengPlayers = players.filter((p) => p.camp === 'bad');
</script>

<div class="final-result-panel">
	<div class="result-header">
		<h2
			class="winner-title"
			class:xu-yuan={winner === '許愿陣營'}
			class:lao-chao-feng={winner === '老朝奉陣營'}
		>
			🎉 {winner} 獲勝！
		</h2>
		<div class="final-score">
			<span class="score-label">最終得分：</span>
			<span class="score-value">{xuYuanScore} / 6</span>
		</div>
	</div>

	<!-- 獸首結算 -->
	<div class="section">
		<h3 class="section-title">🔍 獸首鑑定結果</h3>
		<div class="rounds-summary">
			{#each [1, 2, 3] as round, index (round)}
				<div class="round-card">
					<div class="round-header">
						<h4>第 {round} 回合</h4>
						<div class="round-score">真品: {genuineCountByRound[index]}/2</div>
					</div>
					<div class="artifacts-list">
						{#each artifactsByRound[index].filter((a) => a.voteRank === 1 || a.voteRank === 2) as artifact (artifact.animal)}
							<div class="artifact-item" class:genuine={artifact.isGenuine}>
								<span class="rank-badge">{getRankBadge(artifact.voteRank)}</span>
								<span class="artifact-name">{artifact.animal}首</span>
								<span class="artifact-status" class:is-genuine={artifact.isGenuine}>
									{artifact.isGenuine ? '真品 ✓' : '贗品 ✗'}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- 鑑人結果 -->
	{#if identificationResults}
		<div class="section">
			<h3 class="section-title">🔍 鑑人階段結果</h3>
			<div class="identification-results">
				<!-- 許愿陣營找老朝奉 -->
				{#if identificationResults.laoChaoFeng}
					<div class="id-result-card">
						<div class="id-header">
							<h4>許愿陣營 → 找出老朝奉</h4>
							<span class="id-status" class:success={identificationResults.laoChaoFeng.success}>
								{identificationResults.laoChaoFeng.success ? '成功 ✓' : '失敗 ✗'}
							</span>
						</div>
						<div class="id-details">
							<p>
								投票目標: <strong>{identificationResults.laoChaoFeng.targetName || '無'}</strong>
							</p>
							<p>實際身份: <strong>{identificationResults.laoChaoFeng.actualName}</strong></p>
							<p>
								票數: {identificationResults.laoChaoFeng.votes} / {identificationResults.laoChaoFeng
									.required} (需過半)
							</p>
							{#if identificationResults.laoChaoFeng.success}
								<p class="score-change">許愿陣營 +1 分</p>
							{/if}

							<!-- 投票詳情展開/收起 -->
							{#if identificationResults.laoChaoFeng.voteDetails && identificationResults.laoChaoFeng.voteDetails.length > 0}
								<button
									class="vote-details-toggle"
									on:click={() => toggleVoteDetails('laoChaoFeng')}
								>
									<span class="toggle-icon">{expandedVoteDetails.laoChaoFeng ? '▼' : '▶'}</span>
									投票詳情 ({identificationResults.laoChaoFeng.voteDetails.length} 人)
								</button>

								{#if expandedVoteDetails.laoChaoFeng}
									<div class="vote-details-list">
										{#each identificationResults.laoChaoFeng.voteDetails as vote, i (i)}
											<div class="voter-item">
												<div class="voter-info">
													<span class="voter-name">{vote.voterName}</span>
													<span class="voter-role">{vote.voterRole}</span>
												</div>
												<span class="vote-arrow">→</span>
												<div class="voted-info">
													<span class="voted-name">{vote.votedFor}</span>
													<span class="voted-role">{vote.votedForRole}</span>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							{/if}
						</div>
					</div>
				{/if}

				<!-- 老朝奉找許愿 -->
				{#if identificationResults.xuYuan}
					<div class="id-result-card">
						<div class="id-header">
							<h4>老朝奉 → 找出許愿</h4>
							<span class="id-status" class:success={identificationResults.xuYuan.success}>
								{identificationResults.xuYuan.success ? '成功 ✓' : '失敗 ✗'}
							</span>
						</div>
						<div class="id-details">
							<p>投票目標: <strong>{identificationResults.xuYuan.targetName || '無'}</strong></p>
							<p>實際身份: <strong>{identificationResults.xuYuan.actualName}</strong></p>
							{#if !identificationResults.xuYuan.success}
								<p class="score-change">許愿陣營 +2 分</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- 藥不然找方震 -->
				{#if identificationResults.fangZhen}
					<div class="id-result-card">
						<div class="id-header">
							<h4>藥不然 → 找出方震</h4>
							<span class="id-status" class:success={identificationResults.fangZhen.success}>
								{identificationResults.fangZhen.success ? '成功 ✓' : '失敗 ✗'}
							</span>
						</div>
						<div class="id-details">
							<p>投票目標: <strong>{identificationResults.fangZhen.targetName || '無'}</strong></p>
							<p>實際身份: <strong>{identificationResults.fangZhen.actualName}</strong></p>
							{#if !identificationResults.fangZhen.success}
								<p class="score-change">許愿陣營 +1 分</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- 玩家角色揭曉 -->
	<div class="section">
		<h3 class="section-title">🎭 玩家角色</h3>
		<div class="camps-wrapper">
			<!-- 許愿陣營 -->
			<div class="camp-section">
				<div class="camp-title-bar xu-yuan-title">
					<span class="camp-icon">😇</span>
					<span class="camp-name">許愿陣營</span>
					<span class="camp-badge">{xuYuanPlayers.length}</span>
				</div>
				<div class="players-grid">
					{#each xuYuanPlayers as player (player.id)}
						<div class="player-item xu-yuan-item">
							<div class="role-text">{player.roleName || '未知角色'}</div>
							<div class="player-text">{player.nickname}</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- 老朝奉陣營 -->
			<div class="camp-section">
				<div class="camp-title-bar lao-chao-feng-title">
					<span class="camp-icon">😈</span>
					<span class="camp-name">老朝奉陣營</span>
					<span class="camp-badge">{laoChaoFengPlayers.length}</span>
				</div>
				<div class="players-grid">
					{#each laoChaoFengPlayers as player (player.id)}
						<div class="player-item lao-chao-feng-item">
							<div class="role-text">{player.roleName || '未知角色'}</div>
							<div class="player-text">{player.nickname}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.final-result-panel {
		padding: 1rem;
		max-width: 100%;
		margin: 0 auto;
		width: 100%;
		overflow-x: hidden;
	}

	.result-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 2px solid rgba(255, 255, 255, 0.1);
	}

	.winner-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	}

	.winner-title.xu-yuan {
		color: #ef4444;
	}

	.winner-title.lao-chao-feng {
		color: #9ca3af;
	}

	.final-score {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 1.5rem;
	}

	.score-label {
		color: hsl(var(--muted-foreground));
	}

	.score-value {
		color: #fbbf24;
		font-weight: 700;
		font-size: 1.5rem;
	}

	.section {
		margin-bottom: 2rem;
	}

	.section-title {
		color: hsl(var(--foreground));
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
	}

	.rounds-summary {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 769px) {
		.rounds-summary {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		}
	}

	.round-card {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.75rem;
		padding: 1rem;
	}

	.round-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.round-header h4 {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		margin: 0;
	}

	.round-score {
		color: #fbbf24;
		font-weight: 600;
	}

	.artifacts-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.artifact-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0.5rem;
	}

	.artifact-item.genuine {
		background: rgba(34, 197, 94, 0.1);
	}

	.rank-badge {
		font-size: 1.25rem;
	}

	.artifact-name {
		flex: 1;
		color: hsl(var(--foreground));
	}

	.artifact-status {
		font-weight: 600;
		color: #ef4444;
	}

	.artifact-status.is-genuine {
		color: #22c55e;
	}

	.identification-results {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.id-result-card {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.75rem;
		padding: 1.25rem;
	}

	.id-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.id-header h4 {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		margin: 0;
	}

	.id-status {
		padding: 0.25rem 0.75rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.id-status.success {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.id-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.id-details p {
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.id-details strong {
		color: hsl(var(--foreground));
	}

	.score-change {
		color: #fbbf24 !important;
		font-weight: 600 !important;
	}

	/* 投票詳情按鈕 */
	.vote-details-toggle {
		width: 100%;
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		color: hsl(var(--foreground));
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.vote-details-toggle:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.toggle-icon {
		color: hsl(var(--foreground));
		font-size: 0.75rem;
		transition: transform 0.2s;
	}

	/* 投票詳情列表 */
	.vote-details-list {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.voter-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.2s ease;
	}

	.voter-item:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
		transform: translateX(4px);
	}

	.voter-info,
	.voted-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.voter-name,
	.voted-name {
		font-weight: 700;
		font-size: 1rem;
		line-height: 1.4;
		color: hsl(var(--foreground));
	}

	.voter-role,
	.voted-role {
		font-size: 0.8125rem;
		color: hsl(var(--muted-foreground));
		line-height: 1.4;
	}

	.vote-arrow {
		color: hsl(var(--muted-foreground));
		font-size: 1.125rem;
		opacity: 0.6;
		flex-shrink: 0;
	}

	/* 玩家角色區塊 */
	.camps-wrapper {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
	}

	.camp-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.camp-title-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		border-radius: 0.625rem;
		font-weight: 700;
		font-size: 1.125rem;
	}

	.camp-title-bar.xu-yuan-title {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		color: white;
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
	}

	.camp-title-bar.lao-chao-feng-title {
		background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
		color: white;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.camp-icon {
		font-size: 1.375rem;
	}

	.camp-name {
		flex: 1;
		letter-spacing: 0.025em;
	}

	.camp-badge {
		background: rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		min-width: 2rem;
		text-align: center;
	}

	.players-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.875rem;
	}

	.player-item {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
		padding: 0.875rem;
		text-align: center;
		transition: all 0.2s ease;
		border: 1px solid transparent;
	}

	.player-item:hover {
		transform: translateY(-2px);
	}

	.player-item.xu-yuan-item {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
		border-color: rgba(239, 68, 68, 0.2);
	}

	.player-item.xu-yuan-item:hover {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 100%);
		border-color: rgba(239, 68, 68, 0.35);
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
	}

	.player-item.lao-chao-feng-item {
		background: linear-gradient(135deg, rgba(75, 85, 99, 0.15) 0%, rgba(75, 85, 99, 0.08) 100%);
		border-color: rgba(75, 85, 99, 0.25);
	}

	.player-item.lao-chao-feng-item:hover {
		background: linear-gradient(135deg, rgba(75, 85, 99, 0.2) 0%, rgba(75, 85, 99, 0.12) 100%);
		border-color: rgba(75, 85, 99, 0.4);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.role-text {
		display: block;
		font-size: 1rem;
		font-weight: 700;
		margin-bottom: 0.375rem;
		letter-spacing: 0.025em;
		line-height: 1.4;
	}

	.xu-yuan-item .role-text {
		color: #f87171;
	}

	.lao-chao-feng-item .role-text {
		color: #e5e7eb;
	}

	.player-text {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		opacity: 0.75;
		line-height: 1.4;
	}

	.xu-yuan-item .player-text {
		color: #fecaca;
	}

	.lao-chao-feng-item .player-text {
		color: #d1d5db;
	}
</style>
