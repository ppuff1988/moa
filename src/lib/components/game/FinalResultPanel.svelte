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
		targetId: number;
		targetName?: string;
		actualName?: string;
		votes?: number;
		required?: number;
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
		<h3 class="section-title">📜 獸首鑑定結果</h3>
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
		<h3 class="section-title">👥 玩家角色</h3>
		<div class="camps-container">
			<!-- 許愿陣營 -->
			<div class="camp-column xu-yuan-camp">
				<div class="camp-header">
					<h4 class="camp-title">✨ 許愿陣營</h4>
					<span class="camp-count">{xuYuanPlayers.length} 人</span>
				</div>
				<div class="camp-players">
					{#each xuYuanPlayers as player (player.id)}
						<div class="player-card" style="border-color: {player.colorCode}">
							<div class="player-name" style="color: {player.colorCode}">{player.nickname}</div>
							<div class="player-role">{player.roleName}</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- 老朝奉陣營 -->
			<div class="camp-column lao-chao-feng-camp">
				<div class="camp-header">
					<h4 class="camp-title">🔥 老朝奉陣營</h4>
					<span class="camp-count">{laoChaoFengPlayers.length} 人</span>
				</div>
				<div class="camp-players">
					{#each laoChaoFengPlayers as player (player.id)}
						<div class="player-card" style="border-color: {player.colorCode}">
							<div class="player-name" style="color: {player.colorCode}">{player.nickname}</div>
							<div class="player-role">{player.roleName}</div>
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
		color: #22c55e;
	}

	.winner-title.lao-chao-feng {
		color: #ef4444;
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

	/* 陣營容器 - 兩欄布局 */
	.camps-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.camp-column {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 1rem;
		padding: 1.25rem;
		border: 2px solid;
	}

	.camp-column.xu-yuan-camp {
		border-color: rgba(34, 197, 94, 0.3);
		background: rgba(34, 197, 94, 0.05);
	}

	.camp-column.lao-chao-feng-camp {
		border-color: rgba(239, 68, 68, 0.3);
		background: rgba(239, 68, 68, 0.05);
	}

	.camp-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid rgba(255, 255, 255, 0.1);
	}

	.camp-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		color: hsl(var(--foreground));
	}

	.xu-yuan-camp .camp-title {
		color: #22c55e;
	}

	.lao-chao-feng-camp .camp-title {
		color: #ef4444;
	}

	.camp-count {
		background: rgba(255, 255, 255, 0.1);
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
	}

	.camp-players {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.player-card {
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid;
		border-radius: 0.75rem;
		padding: 1rem;
		text-align: center;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.player-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.player-name {
		font-size: 1.125rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	.player-role {
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	/* 響應式設計 */
	@media (max-width: 768px) {
		.camps-container {
			grid-template-columns: 1fr;
		}
	}
</style>
