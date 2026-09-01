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

	interface VoteDetail {
		voterName: string;
		voterRole: string;
		votedFor: string;
		votedForRole: string;
		voterColorCode: string | null;
		votedColorCode: string | null;
	}

	interface IdentificationResult {
		success: boolean;
		targetName?: string;
		actualName?: string;
		votes?: number;
		required?: number;
		voteDetails?: VoteDetail[];
	}

	interface IdentificationResults {
		laoChaoFeng?: IdentificationResult | null;
		xuYuan?: IdentificationResult | null;
		fangZhen?: IdentificationResult | null;
	}

	interface IdentificationEntry {
		key: 'laoChaoFeng' | 'xuYuan' | 'fangZhen';
		label: string;
		from: string;
		objective: string;
		result: IdentificationResult;
		awardedPoints: number;
	}

	export let winner: string;
	export let xuYuanScore: number;
	export let allArtifacts: Artifact[] = [];
	export let players: Player[] = [];
	export let identificationResults: IdentificationResults | null = null;

	const winThreshold = 6;

	$: artifactsByRound = [1, 2, 3].map((round) =>
		allArtifacts.filter((artifact) => artifact.round === round)
	);
	$: genuineCountByRound = artifactsByRound.map(
		(artifacts) =>
			artifacts.filter(
				(artifact) => (artifact.voteRank === 1 || artifact.voteRank === 2) && artifact.isGenuine
			).length
	);
	$: xuYuanPlayers = players.filter((player) => player.camp === 'good');
	$: laoChaoFengPlayers = players.filter((player) => player.camp === 'bad');
	$: identificationEntries = getIdentificationEntries(identificationResults);
	$: winnerFactionColor = winner === '許愿陣營' ? 'red' : 'black';

	function getIdentificationEntries(results: IdentificationResults | null): IdentificationEntry[] {
		if (!results) return [];

		const entries: IdentificationEntry[] = [];
		if (results.laoChaoFeng) {
			entries.push({
				key: 'laoChaoFeng',
				label: '陣營判定',
				from: '許愿陣營',
				objective: '找出老朝奉',
				result: results.laoChaoFeng,
				awardedPoints: results.laoChaoFeng.success ? 1 : 0
			});
		}
		if (results.xuYuan) {
			entries.push({
				key: 'xuYuan',
				label: '反制判定',
				from: '老朝奉',
				objective: '找出許愿',
				result: results.xuYuan,
				awardedPoints: results.xuYuan.success ? 0 : 2
			});
		}
		if (results.fangZhen) {
			entries.push({
				key: 'fangZhen',
				label: '角色判定',
				from: '藥不然',
				objective: '找出方震',
				result: results.fangZhen,
				awardedPoints: results.fangZhen.success ? 0 : 1
			});
		}

		return entries;
	}

	function getRankBadge(voteRank: number | null | undefined): string {
		if (voteRank === 1) return '🥇';
		if (voteRank === 2) return '🥈';
		return '';
	}

	function getZodiacImagePath(animal: string): string {
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
		const imageNumber = zodiacMap[animal] ?? 1;
		return `/zodiac/zodiac_${imageNumber.toString().padStart(2, '0')}.png`;
	}
</script>

<section class="final-result-panel" aria-labelledby="settlement-title">
	<header class="result-hero" data-faction-color={winnerFactionColor}>
		<div class="winner-copy">
			<p class="eyebrow">
				<span class="faction-marker" aria-hidden="true"></span>
				{winnerFactionColor === 'red' ? '紅方' : '黑方'} · 最終結算
			</p>
			<h2 id="settlement-title" class="winner-title">
				<span>{winner}</span>
				<strong>獲勝</strong>
			</h2>
			<p class="winner-note">三輪鑑定與角色判定均已完成</p>
		</div>

		<div
			class="score-ledger"
			aria-label={`許愿陣營最終得分 ${xuYuanScore}，勝利門檻 ${winThreshold}`}
		>
			<span class="score-label">許愿陣營得分</span>
			<div class="score-value">
				<strong>{xuYuanScore}</strong>
				<span>/ {winThreshold}</span>
			</div>
			<div
				class="score-progress"
				role="progressbar"
				aria-label="許愿陣營最終得分"
				aria-valuenow={xuYuanScore}
				aria-valuemin="0"
				aria-valuemax={Math.max(winThreshold, xuYuanScore)}
			>
				<span style:width={`${Math.min((xuYuanScore / winThreshold) * 100, 100)}%`}></span>
			</div>
			<small
				>{xuYuanScore >= winThreshold
					? '已越過勝利門檻'
					: `距離門檻 ${winThreshold - xuYuanScore} 分`}</small
			>
		</div>
	</header>

	<section class="result-section" aria-labelledby="artifact-results-title">
		<header class="section-heading">
			<span class="section-index">01</span>
			<div>
				<p>三輪入選紀錄</p>
				<h3 id="artifact-results-title">獸首鑑定結果</h3>
			</div>
		</header>

		<ol class="rounds-summary">
			{#each [1, 2, 3] as round, index (round)}
				<li class="round-card" class:perfect-round={genuineCountByRound[index] === 2}>
					<header class="round-header">
						<div>
							<span class="round-index">0{round}</span>
							<h4>第 {round} 回合</h4>
						</div>
						<p class="round-score">
							<strong>{genuineCountByRound[index]}</strong><span>/ 2 真品</span>
						</p>
					</header>

					<div class="artifacts-list">
						{#each artifactsByRound[index].filter((artifact) => artifact.voteRank === 1 || artifact.voteRank === 2) as artifact (artifact.id ?? artifact.animal)}
							<article class="artifact-item" class:genuine={artifact.isGenuine}>
								<span class="rank-badge" aria-label={`第 ${artifact.voteRank} 名`}>
									{getRankBadge(artifact.voteRank)}
								</span>
								<img
									class="artifact-portrait"
									src={getZodiacImagePath(artifact.animal)}
									alt={`${artifact.animal}首雕像`}
								/>
								<div class="artifact-identity">
									<strong>{artifact.animal}首</strong>
									<small>本回合第 {artifact.voteRank} 名</small>
								</div>
								<span class="artifact-status" class:is-genuine={artifact.isGenuine}>
									{artifact.isGenuine ? '真品' : '贗品'}
								</span>
							</article>
						{:else}
							<p class="empty-round">本回合沒有入選紀錄</p>
						{/each}
					</div>
				</li>
			{/each}
		</ol>
	</section>

	{#if identificationEntries.length > 0}
		<section class="result-section" aria-labelledby="identification-results-title">
			<header class="section-heading">
				<span class="section-index">02</span>
				<div>
					<p>終局角色判定</p>
					<h3 id="identification-results-title">鑑人階段結果</h3>
				</div>
			</header>

			<div class="identification-results">
				{#each identificationEntries as entry (entry.key)}
					<article class="id-result-card" class:successful={entry.result.success}>
						<header class="id-header">
							<div>
								<span class="id-kicker">{entry.label}</span>
								<h4>{entry.from} <span aria-hidden="true">→</span> {entry.objective}</h4>
							</div>
							<span class="id-status" class:success={entry.result.success}>
								{entry.result.success ? '判定成功' : '判定失敗'}
							</span>
						</header>

						<dl class="id-facts">
							<div>
								<dt>投票目標</dt>
								<dd>{entry.result.targetName || '無'}</dd>
							</div>
							<div>
								<dt>實際身份</dt>
								<dd>{entry.result.actualName || '未公開'}</dd>
							</div>
							{#if entry.result.votes !== undefined && entry.result.required !== undefined}
								<div>
									<dt>得票門檻</dt>
									<dd>{entry.result.votes} / {entry.result.required}</dd>
								</div>
							{/if}
							{#if entry.awardedPoints > 0}
								<div class="score-award">
									<dt>計分結果</dt>
									<dd>許愿陣營 +{entry.awardedPoints}</dd>
								</div>
							{/if}
						</dl>

						{#if entry.result.voteDetails && entry.result.voteDetails.length > 0}
							<details class="vote-disclosure">
								<summary>
									<span>查看投票明細</span>
									<small>{entry.result.voteDetails.length} 人</small>
									<i aria-hidden="true"></i>
								</summary>
								<div class="vote-details-list">
									{#each entry.result.voteDetails as vote, voteIndex (`${entry.key}-${voteIndex}`)}
										<div class="voter-item">
											<div class="vote-person">
												<span
													class="player-color-dot"
													style={`--player-color: ${vote.voterColorCode || '#8f877b'}`}
												></span>
												<span><strong>{vote.voterName}</strong><small>{vote.voterRole}</small></span
												>
											</div>
											<span class="vote-arrow" aria-hidden="true">→</span>
											<div class="vote-person voted-person">
												<span
													class="player-color-dot"
													style={`--player-color: ${vote.votedColorCode || '#8f877b'}`}
												></span>
												<span
													><strong>{vote.votedFor}</strong><small>{vote.votedForRole}</small></span
												>
											</div>
										</div>
									{/each}
								</div>
							</details>
						{/if}
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<section class="result-section" aria-labelledby="player-roles-title">
		<header class="section-heading">
			<span class="section-index">03</span>
			<div>
				<p>全員身份公開</p>
				<h3 id="player-roles-title">玩家角色</h3>
			</div>
		</header>

		<div class="camps-wrapper">
			<section
				class="camp-section xu-yuan-camp"
				aria-labelledby="xu-yuan-camp-title"
				data-faction-color="red"
			>
				<header class="camp-title-bar">
					<span class="faction-swatch" aria-hidden="true">👼</span>
					<div>
						<h4 id="xu-yuan-camp-title">許愿陣營</h4>
						<p><strong>紅方</strong> · {xuYuanPlayers.length} 位玩家</p>
					</div>
				</header>
				<div class="players-grid">
					{#each xuYuanPlayers as player (player.id)}
						<article class="player-item" style={`--player-color: ${player.colorCode || '#8f877b'}`}>
							<span class="player-color-dot" aria-hidden="true"></span>
							<div>
								<strong class="role-text">{player.roleName || '未知角色'}</strong><span
									class="player-text">{player.nickname}</span
								>
							</div>
						</article>
					{/each}
				</div>
			</section>

			<section
				class="camp-section lao-chao-feng-camp"
				aria-labelledby="lao-chao-feng-camp-title"
				data-faction-color="black"
			>
				<header class="camp-title-bar">
					<span class="faction-swatch" aria-hidden="true">😈</span>
					<div>
						<h4 id="lao-chao-feng-camp-title">老朝奉陣營</h4>
						<p><strong>黑方</strong> · {laoChaoFengPlayers.length} 位玩家</p>
					</div>
				</header>
				<div class="players-grid">
					{#each laoChaoFengPlayers as player (player.id)}
						<article class="player-item" style={`--player-color: ${player.colorCode || '#8f877b'}`}>
							<span class="player-color-dot" aria-hidden="true"></span>
							<div>
								<strong class="role-text">{player.roleName || '未知角色'}</strong><span
									class="player-text">{player.nickname}</span
								>
							</div>
						</article>
					{/each}
				</div>
			</section>
		</div>
	</section>
</section>

<style>
	.final-result-panel {
		--settlement-gold: #d6bc76;
		--settlement-gold-bright: #ead99f;
		--settlement-surface: rgba(255, 248, 232, 0.055);
		--settlement-line: rgba(214, 188, 118, 0.2);
		--settlement-text: #f5efe6;
		--settlement-muted: #b9afa3;
		--faction-red: #a9433b;
		--faction-red-light: #dc887f;
		--faction-black: #0c0c0b;
		--faction-silver: #aaa39a;
		width: min(100%, 88rem);
		margin: 0 auto;
		padding: clamp(0.25rem, 1.5vw, 1rem);
		color: var(--settlement-text);
	}

	.result-hero {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(15rem, 0.38fr);
		align-items: end;
		gap: clamp(2rem, 6vw, 6rem);
		min-height: 18rem;
		margin-bottom: clamp(3.5rem, 7vw, 6rem);
		padding: clamp(2rem, 5vw, 4.5rem);
		overflow: hidden;
		background:
			radial-gradient(circle at 14% 0%, rgba(180, 111, 56, 0.28), transparent 38%),
			linear-gradient(145deg, rgba(46, 41, 34, 0.96), rgba(23, 21, 18, 0.98));
		border: 1px solid rgba(214, 188, 118, 0.32);
		border-radius: 1.25rem 1.25rem 0.5rem 0.5rem;
		box-shadow:
			0 2rem 5rem rgba(11, 8, 5, 0.28),
			inset 0 1px 0 rgba(255, 248, 232, 0.08);
	}

	.result-hero::before {
		position: absolute;
		top: 0;
		left: clamp(2rem, 5vw, 4.5rem);
		width: 7rem;
		height: 0.2rem;
		background: var(--settlement-gold);
		content: '';
	}

	.result-hero[data-faction-color='red'] {
		background:
			radial-gradient(circle at 14% 0%, rgba(169, 67, 59, 0.3), transparent 42%),
			linear-gradient(145deg, rgba(49, 35, 31, 0.97), rgba(23, 21, 18, 0.98));
	}

	.result-hero[data-faction-color='red']::before {
		background: var(--faction-red);
	}

	.result-hero[data-faction-color='black'] {
		background:
			radial-gradient(circle at 14% 0%, rgba(153, 145, 133, 0.12), transparent 40%),
			linear-gradient(145deg, #25231f, var(--faction-black));
	}

	.result-hero[data-faction-color='black']::before {
		background: var(--faction-silver);
	}

	.result-hero::after {
		position: absolute;
		right: -5rem;
		bottom: -8rem;
		width: 20rem;
		height: 20rem;
		border: 1px solid rgba(214, 188, 118, 0.12);
		border-radius: 50%;
		box-shadow:
			0 0 0 3rem rgba(214, 188, 118, 0.025),
			0 0 0 7rem rgba(214, 188, 118, 0.018);
		content: '';
		pointer-events: none;
	}

	.winner-copy,
	.score-ledger {
		position: relative;
		z-index: 1;
	}
	.eyebrow,
	.section-heading p,
	.id-kicker {
		margin: 0;
		color: var(--settlement-gold);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.16em;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.faction-marker {
		width: 0.55rem;
		height: 0.55rem;
		background: var(--faction-silver);
		border: 1px solid rgba(255, 255, 255, 0.35);
		border-radius: 0.12rem;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.42);
	}

	.result-hero[data-faction-color='red'] .faction-marker {
		background: var(--faction-red);
	}

	.result-hero[data-faction-color='black'] .eyebrow {
		color: var(--faction-silver);
	}

	.winner-title {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 1rem 0;
		font-family: 'Noto Serif TC', 'Songti TC', 'Microsoft JhengHei', serif;
		font-size: clamp(2.4rem, 6vw, 5.25rem);
		font-weight: 600;
		letter-spacing: -0.055em;
		line-height: 0.96;
		text-wrap: balance;
	}

	.winner-title strong {
		color: var(--settlement-gold-bright);
		font-size: 0.45em;
		font-weight: 600;
		letter-spacing: 0.12em;
	}
	.result-hero[data-faction-color='red'] .winner-title strong {
		color: var(--faction-red-light);
	}
	.result-hero[data-faction-color='black'] .winner-title strong {
		color: #d5cec4;
	}
	.winner-note {
		margin: 0;
		color: var(--settlement-muted);
		font-size: 0.9rem;
	}
	.score-ledger {
		padding: 1.25rem 0 0.25rem;
		border-top: 1px solid rgba(214, 188, 118, 0.28);
	}
	.score-label {
		color: var(--settlement-muted);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.08em;
	}
	.score-value {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin: 0.45rem 0 0.75rem;
		font-variant-numeric: tabular-nums;
	}
	.score-value strong {
		color: var(--settlement-gold-bright);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: clamp(3rem, 7vw, 5.25rem);
		font-weight: 600;
		letter-spacing: -0.08em;
		line-height: 0.9;
	}
	.score-value span {
		color: var(--settlement-muted);
		font-size: 1.15rem;
	}
	.score-progress {
		height: 0.28rem;
		overflow: hidden;
		background: rgba(255, 248, 232, 0.1);
		border-radius: 999px;
	}
	.score-progress span {
		display: block;
		height: 100%;
		background: var(--settlement-gold);
		border-radius: inherit;
	}
	.score-ledger small {
		display: block;
		margin-top: 0.6rem;
		color: #d7ccbd;
		font-size: 0.72rem;
	}

	.result-section {
		margin-bottom: clamp(3.5rem, 7vw, 6rem);
	}
	.section-heading {
		display: grid;
		grid-template-columns: 2.75rem minmax(0, 1fr);
		align-items: start;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--settlement-line);
	}
	.section-index {
		color: rgba(214, 188, 118, 0.62);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}
	.section-heading h3 {
		margin: 0.25rem 0 0;
		color: var(--settlement-text);
		font-family: 'Noto Serif TC', 'Songti TC', 'Microsoft JhengHei', serif;
		font-size: clamp(1.5rem, 3vw, 2.35rem);
		font-weight: 600;
		letter-spacing: -0.035em;
	}

	.rounds-summary {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1px;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--settlement-line);
		border: 1px solid var(--settlement-line);
		border-radius: 0.5rem 1.25rem 0.5rem 0.5rem;
		list-style: none;
	}
	.round-card {
		min-width: 0;
		padding: clamp(1rem, 2vw, 1.5rem);
		background:
			radial-gradient(circle at 100% 0%, rgba(148, 91, 51, 0.1), transparent 32%), #24211d;
	}
	.round-card.perfect-round {
		background:
			radial-gradient(circle at 100% 0%, rgba(214, 188, 118, 0.13), transparent 38%), #28251f;
	}
	.round-header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.round-header > div {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
	}
	.round-index {
		color: rgba(214, 188, 118, 0.55);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.7rem;
	}
	.round-header h4 {
		margin: 0;
		font-size: 1rem;
		font-weight: 650;
	}
	.round-score {
		display: flex;
		align-items: baseline;
		gap: 0.2rem;
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.round-score strong {
		color: var(--settlement-gold-bright);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 1.5rem;
		font-weight: 600;
	}
	.round-score span {
		color: var(--settlement-muted);
		font-size: 0.68rem;
	}

	.artifacts-list {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.artifact-item {
		display: grid;
		grid-template-columns: 1.35rem 3rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.65rem;
		min-width: 0;
		padding: 0.55rem;
		background: rgba(10, 8, 6, 0.28);
		border-left: 2px solid rgba(205, 130, 116, 0.72);
		border-radius: 0.3rem;
	}
	.artifact-item.genuine {
		border-left-color: rgba(134, 190, 151, 0.78);
	}
	.rank-badge {
		font-size: 1rem;
		text-align: center;
	}
	.artifact-portrait {
		width: 3rem;
		aspect-ratio: 1;
		object-fit: cover;
		border: 1px solid rgba(214, 188, 118, 0.22);
		border-radius: 0.25rem;
		filter: sepia(0.18) contrast(1.04);
	}
	.artifact-identity {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.artifact-identity strong {
		overflow: hidden;
		font-size: 0.9rem;
		font-weight: 650;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.artifact-identity small {
		color: var(--settlement-muted);
		font-size: 0.65rem;
	}
	.artifact-status,
	.id-status {
		color: #d69389;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}
	.artifact-status.is-genuine,
	.id-status.success {
		color: #98c9a5;
	}
	.empty-round {
		margin: 0;
		padding: 1.4rem 0.75rem;
		color: #8f877b;
		font-size: 0.75rem;
		text-align: center;
	}

	.identification-results {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.id-result-card {
		padding: clamp(1rem, 2.5vw, 1.6rem);
		background: var(--settlement-surface);
		border-left: 2px solid rgba(205, 130, 116, 0.72);
		border-radius: 0.3rem 0.8rem 0.8rem 0.3rem;
		box-shadow: inset 0 1px 0 rgba(255, 248, 232, 0.035);
	}
	.id-result-card.successful {
		border-left-color: rgba(134, 190, 151, 0.78);
	}
	.id-header {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1.25rem;
		margin-bottom: 1.15rem;
	}
	.id-header h4 {
		margin: 0.3rem 0 0;
		font-size: clamp(1rem, 2vw, 1.2rem);
		font-weight: 600;
	}
	.id-header h4 span {
		margin: 0 0.25rem;
		color: rgba(214, 188, 118, 0.58);
	}
	.id-status {
		padding: 0.4rem 0.55rem;
		background: rgba(205, 130, 116, 0.1);
		border: 1px solid rgba(205, 130, 116, 0.2);
		border-radius: 0.3rem;
	}
	.id-status.success {
		background: rgba(134, 190, 151, 0.1);
		border-color: rgba(134, 190, 151, 0.2);
	}
	.id-facts {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		margin: 0;
		border-block: 1px solid rgba(255, 248, 232, 0.08);
	}
	.id-facts > div {
		min-width: 0;
		padding: 0.9rem 1rem;
		border-right: 1px solid rgba(255, 248, 232, 0.08);
	}
	.id-facts > div:first-child {
		padding-left: 0;
	}
	.id-facts > div:last-child {
		border-right: 0;
	}
	.id-facts dt {
		margin-bottom: 0.25rem;
		color: var(--settlement-muted);
		font-size: 0.68rem;
	}
	.id-facts dd {
		margin: 0;
		overflow: hidden;
		color: var(--settlement-text);
		font-size: 0.85rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.id-facts .score-award dd {
		color: var(--settlement-gold-bright);
	}

	.vote-disclosure {
		margin-top: 1rem;
	}
	.vote-disclosure summary {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto 1rem;
		align-items: center;
		gap: 0.7rem;
		min-height: 2.5rem;
		padding: 0 0.75rem;
		color: #d7ccbd;
		font-size: 0.78rem;
		cursor: pointer;
		list-style: none;
		background: rgba(10, 8, 6, 0.2);
		border: 1px solid rgba(255, 248, 232, 0.1);
		border-radius: 0.35rem;
		transition:
			background-color 180ms ease,
			border-color 180ms ease;
	}
	.vote-disclosure summary::-webkit-details-marker {
		display: none;
	}
	.vote-disclosure summary:hover {
		background: rgba(214, 188, 118, 0.08);
		border-color: rgba(214, 188, 118, 0.3);
	}
	.vote-disclosure summary:focus-visible {
		outline: 2px solid var(--settlement-gold);
		outline-offset: 3px;
	}
	.vote-disclosure summary small {
		color: var(--settlement-muted);
	}
	.vote-disclosure summary i {
		width: 0.45rem;
		height: 0.45rem;
		border-right: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		transform: rotate(45deg) translateY(-0.1rem);
		transition: transform 180ms ease;
	}
	.vote-disclosure[open] summary i {
		transform: rotate(225deg) translate(-0.1rem, -0.1rem);
	}
	.vote-details-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.6rem;
	}
	.voter-item {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: rgba(255, 248, 232, 0.035);
		border-radius: 0.35rem;
	}
	.vote-person {
		display: grid;
		grid-template-columns: 0.7rem minmax(0, 1fr);
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
	}
	.vote-person > span:last-child,
	.player-item > div {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.vote-person strong {
		overflow: hidden;
		font-size: 0.8rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.vote-person small {
		color: var(--settlement-muted);
		font-size: 0.65rem;
	}
	.vote-arrow {
		color: rgba(214, 188, 118, 0.58);
	}
	.player-color-dot {
		width: 0.7rem;
		height: 0.7rem;
		background: var(--player-color);
		border: 1px solid rgba(255, 255, 255, 0.7);
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
	}

	.camps-wrapper {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}
	.camp-section {
		min-width: 0;
		padding: clamp(1rem, 2vw, 1.5rem);
		background: var(--settlement-surface);
		border-top: 3px solid transparent;
		border-radius: 0.35rem 0.35rem 0.9rem 0.9rem;
	}
	.xu-yuan-camp {
		background:
			radial-gradient(circle at 0% 0%, rgba(169, 67, 59, 0.2), transparent 36%),
			rgba(255, 248, 232, 0.045);
		border-top-color: var(--faction-red);
	}
	.lao-chao-feng-camp {
		background:
			radial-gradient(circle at 0% 0%, rgba(170, 163, 154, 0.11), transparent 36%),
			rgba(7, 7, 6, 0.42);
		border-top-color: var(--faction-black);
		box-shadow: inset 0 1px 0 rgba(170, 163, 154, 0.2);
	}
	.camp-title-bar {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: 1rem;
	}
	.faction-swatch {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		background:
			radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.2), transparent 28%),
			var(--faction-red);
		border: 1px solid rgba(226, 154, 145, 0.5);
		border-radius: 0.25rem;
		font-size: 1.2rem;
		line-height: 1;
		box-shadow:
			inset 0 0 0 0.3rem rgba(52, 10, 8, 0.18),
			0 0.35rem 0.8rem rgba(81, 20, 17, 0.22);
	}
	.lao-chao-feng-camp .faction-swatch {
		background:
			radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.14), transparent 28%),
			var(--faction-black);
		border-color: rgba(170, 163, 154, 0.42);
		box-shadow:
			inset 0 0 0 0.3rem rgba(255, 255, 255, 0.025),
			0 0.35rem 0.8rem rgba(0, 0, 0, 0.32);
	}
	.camp-title-bar h4 {
		margin: 0;
		font-size: 1rem;
		font-weight: 650;
	}
	.camp-title-bar p {
		margin: 0.15rem 0 0;
		color: var(--settlement-muted);
		font-size: 0.68rem;
	}
	.camp-title-bar p strong {
		font-weight: 750;
		letter-spacing: 0.08em;
	}
	.xu-yuan-camp .camp-title-bar p strong {
		color: var(--faction-red-light);
	}
	.lao-chao-feng-camp .camp-title-bar p strong {
		color: var(--faction-silver);
	}
	.players-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: 0.5rem;
	}
	.player-item {
		display: grid;
		grid-template-columns: 0.7rem minmax(0, 1fr);
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
		padding: 0.75rem;
		background: rgba(10, 8, 6, 0.2);
		border: 1px solid rgba(255, 248, 232, 0.08);
		border-radius: 0.35rem;
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			background-color 180ms ease;
	}
	.player-item:hover {
		transform: translateY(-2px);
		background: rgba(214, 188, 118, 0.06);
		border-color: rgba(214, 188, 118, 0.24);
	}
	.xu-yuan-camp .player-item:hover {
		background: rgba(169, 67, 59, 0.1);
		border-color: rgba(220, 136, 127, 0.32);
	}
	.lao-chao-feng-camp .player-item:hover {
		background: rgba(170, 163, 154, 0.07);
		border-color: rgba(170, 163, 154, 0.24);
	}
	.role-text,
	.player-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.role-text {
		color: var(--settlement-text);
		font-size: 0.8rem;
		font-weight: 650;
	}
	.player-text {
		margin-top: 0.1rem;
		color: var(--settlement-muted);
		font-size: 0.68rem;
	}

	@media (max-width: 900px) {
		.result-hero {
			grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.42fr);
			gap: 2rem;
		}
		.rounds-summary {
			grid-template-columns: 1fr;
		}
		.id-facts {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.id-facts > div:nth-child(2n) {
			border-right: 0;
		}
	}

	@media (max-width: 640px) {
		.final-result-panel {
			padding: 0;
		}
		.result-hero {
			grid-template-columns: 1fr;
			align-items: start;
			min-height: auto;
			margin-bottom: 3rem;
			padding: 2.25rem 1.25rem 1.5rem;
			border-radius: 0.9rem 0.9rem 0.35rem 0.35rem;
		}
		.winner-title {
			font-size: clamp(2.25rem, 13vw, 3.5rem);
		}
		.section-heading {
			grid-template-columns: 2rem minmax(0, 1fr);
		}
		.artifact-item {
			grid-template-columns: 1.2rem 2.75rem minmax(0, 1fr) auto;
		}
		.artifact-portrait {
			width: 2.75rem;
		}
		.id-header {
			flex-direction: column;
			gap: 0.75rem;
		}
		.id-facts {
			grid-template-columns: 1fr;
		}
		.id-facts > div,
		.id-facts > div:first-child {
			padding: 0.7rem 0;
			border-right: 0;
			border-bottom: 1px solid rgba(255, 248, 232, 0.08);
		}
		.id-facts > div:last-child {
			border-bottom: 0;
		}
		.voter-item {
			grid-template-columns: 1fr;
			gap: 0.45rem;
		}
		.vote-arrow {
			padding-left: 0.1rem;
			transform: rotate(90deg);
			transform-origin: left center;
		}
		.camps-wrapper {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.vote-disclosure summary,
		.vote-disclosure summary i,
		.player-item {
			transition: none;
		}
	}
</style>
