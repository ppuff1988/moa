<script lang="ts">
	import { overallHonor, roleHonors } from '$lib/content/role-honors';
	import type { AwardWinner, LeaderboardResult } from '$lib/types/leaderboard';

	let {
		leaderboard,
		loading = false
	}: {
		leaderboard: LeaderboardResult & { selectedRoleId: number | null };
		loading?: boolean;
	} = $props();
	let selectedRole = $derived(
		leaderboard.roles.find((role) => role.id === leaderboard.selectedRoleId)
	);
	let honor = $derived(
		selectedRole
			? (roleHonors[selectedRole.name] ?? {
					title: '角色名家',
					comment: '每一場勝利，都是入局的證明。',
					seal: '席'
				})
			: overallHonor
	);
	let basePath = $derived(selectedRole ? `/leaderboard/roles/${selectedRole.id}` : '/leaderboard');
	let heading = $derived(selectedRole ? `${selectedRole.name}勝場榜` : '玩家勝場榜');
	const number = new Intl.NumberFormat('zh-TW');

	function winnerNames(winners: AwardWinner[], count: number) {
		const names = winners.map((winner) => winner.nickname).join('、');
		return count > winners.length ? `${names}等 ${number.format(count)} 位` : names;
	}

	function pageHref(page: number) {
		return page === 1 ? basePath : `${basePath}?page=${page}`;
	}
</script>

<main class="leaderboard-page" id="leaderboard-content">
	<section class="hero" aria-labelledby="leaderboard-title">
		<div class="hero-copy">
			<p class="eyebrow">以勝場為證，為名家留席</p>
			<h1 id="leaderboard-title">{heading}</h1>
			<p class="intro">
				{selectedRole
					? `每一次扮演${selectedRole.name}，都留下屬於你的戰績。`
					: '有人慧眼識珍，有人偷天換日。'}<br />{selectedRole
					? '在這一席，與同道一較高下。'
					: '每一場對局，都為名家榜添上一筆。'}
			</p>
			<div class="hero-links">
				<a href="#rankings">查看勝場排名 <span aria-hidden="true">↓</span></a><a href="#role-honors"
					>八席名家 <span aria-hidden="true">↗</span></a
				>
			</div>
		</div>
		<aside class="honor-feature" aria-label="本榜榮譽">
			<span class="honor-seal" aria-hidden="true">{honor.seal}</span>
			<div class="honor-copy">
				<p class="honor-label">
					{selectedRole ? `${selectedRole.name} · 專屬榮譽` : '總勝場 · 最高榮譽'}
				</p>
				<h2>{honor.title}</h2>
				<p class="honor-comment">{honor.comment}</p>
			</div>
			<div class="honor-recipient">
				{#if leaderboard.leaderCount > 0}
					<div>
						<span class="recipient-label"
							>{leaderboard.leaderCount > 1
								? `並列得主 · ${number.format(leaderboard.leaderCount)} 位`
								: '本榜得主'}</span
						><strong>{winnerNames(leaderboard.leaders, leaderboard.leaderCount)}</strong>
					</div>
					<p class="honor-wins">{number.format(leaderboard.leaderWins)}<span>勝</span></p>
				{:else}<div><span class="recipient-label">首勝待開</span><strong>虛位以待</strong></div>
					<span class="empty-seal" aria-hidden="true">—</span>{/if}
			</div>
		</aside>
	</section>

	<dl class="stats-strip" aria-label="本榜統計">
		<div>
			<dt>上榜玩家</dt>
			<dd>{number.format(leaderboard.totalPlayers)}<small>位</small></dd>
		</div>
		<div>
			<dt>完成對局</dt>
			<dd>{number.format(leaderboard.totalGames)}<small>場</small></dd>
		</div>
		<div>
			<dt>本榜最高勝場</dt>
			<dd>{number.format(leaderboard.leaderWins)}<small>勝</small></dd>
		</div>
		<div class="scope-note">
			<dt>統計範圍</dt>
			<dd>歷來累計</dd>
		</div>
	</dl>

	<section class="rankings-section" id="rankings" aria-labelledby="rankings-title">
		<div class="section-heading">
			<div>
				<p class="eyebrow">勝場見真章</p>
				<h2 id="rankings-title">{selectedRole ? `${selectedRole.name}名家錄` : '群英名次錄'}</h2>
			</div>
			<a class="refresh-link" href={pageHref(leaderboard.page)} data-sveltekit-reload
				>更新排名 <span aria-hidden="true">↻</span></a
			>
		</div>
		<nav class="role-navigation" aria-label="排行榜分類">
			<a
				href="/leaderboard"
				class:active={!selectedRole}
				aria-current={!selectedRole ? 'page' : undefined}>總勝場榜</a
			>
			{#each leaderboard.roles as role (role.id)}<a
					href={`/leaderboard/roles/${role.id}`}
					class:active={selectedRole?.id === role.id}
					aria-current={selectedRole?.id === role.id ? 'page' : undefined}>{role.name}</a
				>{/each}
		</nav>
		<div class="rankings-layout">
			<div class="ranking-content" aria-busy={loading}>
				{#if loading}<p class="loading-message" role="status">正在更新榜單…</p>{/if}
				{#if leaderboard.entries.length > 0}
					<table aria-label={selectedRole ? `${selectedRole.name}勝場排名` : '玩家勝場排名'}>
						<thead
							><tr
								><th scope="col">名次</th><th scope="col">玩家</th><th
									scope="col"
									class="number-column">勝場</th
								><th scope="col" class="number-column">出場</th><th
									scope="col"
									class="number-column">勝率</th
								></tr
							></thead
						>
						<tbody>
							{#each leaderboard.entries as entry (entry.userId)}
								<tr class:top-rank={entry.rank <= 3 && entry.wins > 0}>
									<td class="rank"
										><span class:rank-seal={entry.rank === 1 && entry.wins > 0}
											>{String(entry.rank).padStart(2, '0')}</span
										></td
									>
									<th scope="row"
										><span class="player-cell"
											><span class="player-initial" aria-hidden="true"
												>{Array.from(entry.nickname)[0] || '客'}</span
											><span class="player-name">{entry.nickname}</span></span
										></th
									>
									<td class="number-column wins">{number.format(entry.wins)}</td><td
										class="number-column games">{number.format(entry.games)}</td
									><td class="number-column win-rate">{entry.winRate.toFixed(1)}<small>%</small></td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<div class="empty-state">
						<span class="empty-mark" aria-hidden="true">席</span>
						<h3>此席，靜候第一位名家。</h3>
						<p>
							{selectedRole
								? `還沒有扮演${selectedRole.name}的完成對局。`
								: '目前還沒有可列入排行的完成對局。'}<br />完成一場遊戲，讓你的名字登上名家錄。
						</p>
						<a href="/" class="start-link">回首頁，邀友開局 <span aria-hidden="true">→</span></a>
					</div>
				{/if}
				<div class="table-footer">
					<span>共 {number.format(leaderboard.totalPlayers)} 位玩家 · 每頁 20 位</span>
					<nav class="pagination" aria-label="排行榜分頁">
						{#if leaderboard.page > 1}<a href={pageHref(leaderboard.page - 1)} aria-label="上一頁"
								>←</a
							>{:else}<span aria-disabled="true" aria-label="上一頁">←</span>{/if}<span
							>{leaderboard.page} / {leaderboard.totalPages}</span
						>{#if leaderboard.page < leaderboard.totalPages}<a
								href={pageHref(leaderboard.page + 1)}
								aria-label="下一頁">→</a
							>{:else}<span aria-disabled="true" aria-label="下一頁">→</span>{/if}
					</nav>
				</div>
			</div>
			<aside class="ranking-rules" aria-labelledby="rules-title">
				<p class="eyebrow">榜上有名，自有章法</p>
				<h3 id="rules-title">入榜規則</h3>
				<ol>
					<li>
						<strong>勝場為先</strong>
						<p>依累計勝場由高至低排序；同勝場並列名次，例如 1、1、3。</p>
					</li>
					<li>
						<strong>一局一筆</strong>
						<p>只計正式完成的對局。未完成或強制結束不計入，結束後離房仍保留戰績。</p>
					</li>
					<li>
						<strong>各席有主</strong>
						<p>角色勝場只計扮演該角色的獲勝對局。至少一勝才授予榮譽，同分並列得主。</p>
					</li>
				</ol>
				<p class="update-note">完成結算後，點選「更新排名」查看最新戰績。</p>
			</aside>
		</div>
	</section>

	<section class="role-honors-section" id="role-honors" aria-labelledby="honors-title">
		<div class="section-heading">
			<div>
				<p class="eyebrow">一角一絕，各有千秋</p>
				<h2 id="honors-title">八席名家</h2>
			</div>
			<p class="section-note">以角色累計勝場，記下每一席的得主。</p>
		</div>
		<div class="honors-grid">
			{#each leaderboard.roles as role (role.id)}
				{@const award = roleHonors[role.name] ?? {
					title: '角色名家',
					comment: '每一場勝利，都是入局的證明。',
					seal: '席'
				}}
				<a
					class="role-honor"
					href={`/leaderboard/roles/${role.id}`}
					aria-label={`${role.name}・${award.title}勝場榜`}
				>
					<div class="award-heading">
						<span class="award-seal" aria-hidden="true">{award.seal}</span><span
							class="camp-label"
							class:bad-camp={role.camp === 'bad'}
							>{role.camp === 'good' ? '許愿陣營' : '老朝奉陣營'}</span
						><span class="award-arrow" aria-hidden="true">↗</span>
					</div>
					<p class="award-role">{role.name}</p>
					<h3>{award.title}</h3>
					<p class="award-comment">{award.comment}</p>
					<div class="award-winners">
						{#if role.leaderCount > 0}<span class="winner-label"
								>{role.leaderCount > 1
									? `並列得主 · ${number.format(role.leaderCount)} 位`
									: '本席得主'}</span
							><strong>{winnerNames(role.leaders, role.leaderCount)}</strong><span
								class="award-count">{number.format(role.leaderWins)} <small>勝</small></span
							>{:else}<span class="winner-label">尚待首勝</span><strong>虛位以待</strong><span
								class="award-count muted"
								aria-hidden="true">—</span
							>{/if}
					</div>
				</a>
			{/each}
		</div>
	</section>
</main>

<style>
	.leaderboard-page {
		--gold: hsl(var(--secondary));
		--ink: #eee7db;
		--muted: #afa599;
		--line: hsl(var(--secondary) / 0.22);
		--serif: 'Noto Serif TC', 'Noto Serif CJK TC', 'Songti TC', serif;
		color: var(--ink);
		width: min(100% - 4rem, 74rem);
		margin-inline: auto;
		padding-block: 3.5rem 4.5rem;
	}
	:where(h1, h2, h3, p, dl, dd) {
		margin: 0;
	}
	:where(h1, h2, h3) {
		font-family: var(--serif);
		font-weight: 500;
		text-wrap: balance;
	}
	p {
		text-wrap: pretty;
	}
	a {
		color: inherit;
		text-decoration: none;
		transition:
			color 180ms,
			background 180ms,
			border-color 180ms;
	}
	a:hover {
		color: var(--gold);
		text-decoration: none;
	}
	a:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 4px;
	}
	a:active {
		transform: translateY(1px);
	}
	section {
		scroll-margin-top: 2rem;
	}
	.hero {
		display: grid;
		grid-template-columns: 1.15fr 1fr;
		align-items: center;
		gap: 4rem;
	}
	.eyebrow {
		color: var(--gold);
		letter-spacing: 0.16em;
		font-size: 0.6875rem;
	}
	h1 {
		margin-top: 0.9rem;
		font-size: clamp(2rem, 3.6vw, 3.25rem);
		letter-spacing: 0.08em;
		line-height: 1.45;
	}
	.intro {
		color: var(--muted);
		font-size: 0.875rem;
		line-height: 1.9;
		margin-top: 1.1rem;
	}
	.hero-links {
		display: flex;
		gap: 2rem;
		margin-top: 1.5rem;
		font-size: 0.8125rem;
	}
	.hero-links a {
		display: inline-flex;
		gap: 1rem;
		align-items: center;
		min-height: 2.75rem;
	}
	.hero-links a:first-child {
		border-bottom: 1px solid var(--gold);
	}
	.honor-feature {
		position: relative;
		display: grid;
		grid-template-columns: 4.5rem 1fr;
		gap: 1rem 1.25rem;
		padding: 1.75rem;
		color: hsl(var(--card-foreground));
		background: var(--gradient-antique);
		border: 1px solid var(--gold);
		border-radius: 0.3rem;
		box-shadow: 0 0.75rem 2rem hsl(30 20% 4% / 0.2);
	}
	.honor-feature::before {
		content: '';
		pointer-events: none;
		position: absolute;
		inset: 0.4rem;
		border: 1px solid hsl(35 25% 40% / 0.25);
	}
	.honor-seal {
		display: grid;
		place-items: center;
		align-self: start;
		width: 4.5rem;
		height: 5rem;
		color: hsl(var(--primary));
		border: 1px solid hsl(var(--primary) / 0.65);
		font: 2.7rem var(--serif);
	}
	.honor-label {
		color: #786246;
		font-size: 0.625rem;
		letter-spacing: 0.12em;
	}
	.honor-copy h2 {
		font-size: 1.75rem;
		letter-spacing: 0.15em;
		margin-top: 0.35rem;
	}
	.honor-comment {
		color: #6e6152;
		font-size: 0.75rem;
		margin-top: 0.45rem;
		line-height: 1.8;
	}
	.honor-recipient {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		grid-column: 1 / -1;
		border-top: 1px solid hsl(35 25% 40% / 0.25);
		padding-top: 1rem;
	}
	.honor-recipient > div {
		min-width: 0;
	}
	.recipient-label {
		display: block;
		font-size: 0.625rem;
		color: #786246;
		margin-bottom: 0.35rem;
	}
	.honor-recipient strong {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		overflow-wrap: anywhere;
	}
	.honor-wins {
		flex-shrink: 0;
		font: 2rem var(--serif);
		font-variant-numeric: tabular-nums;
	}
	.honor-wins span {
		font: 0.75rem sans-serif;
		margin-left: 0.4rem;
	}
	.empty-seal {
		font-size: 1.5rem;
		color: #786246;
	}
	.stats-strip {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 2rem;
		border-block: 1px solid var(--line);
		padding-block: 1.5rem;
		margin-top: 3rem;
	}
	.stats-strip > div + div {
		border-left: 1px solid var(--line);
		padding-left: 2rem;
	}
	.stats-strip dt {
		color: var(--muted);
		font-size: 0.6875rem;
		margin-bottom: 0.4rem;
	}
	.stats-strip dd {
		font: 1.9rem var(--serif);
		font-variant-numeric: tabular-nums;
	}
	.stats-strip small {
		font: 0.75rem sans-serif;
		color: var(--muted);
		margin-left: 0.5rem;
	}
	.scope-note dd {
		font-size: 1.35rem;
		line-height: 1.7;
	}
	.rankings-section {
		margin-top: 3.5rem;
	}
	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.section-heading h2 {
		font-size: 1.9rem;
		letter-spacing: 0.08em;
		margin-top: 0.45rem;
	}
	.refresh-link {
		display: inline-flex;
		align-items: center;
		gap: 0.8rem;
		min-height: 2.75rem;
		color: var(--muted);
		font-size: 0.75rem;
	}
	.role-navigation {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		padding-bottom: 1.5rem;
	}
	.role-navigation a {
		padding: 0.65rem 0.9rem;
		font-size: 0.8125rem;
		border: 1px solid transparent;
		border-radius: 0.2rem;
		color: var(--muted);
	}
	.role-navigation a:hover {
		background: hsl(var(--secondary) / 0.08);
		color: var(--ink);
	}
	.role-navigation .active {
		border-color: var(--line);
		color: var(--gold);
		background: hsl(var(--secondary) / 0.1);
	}
	.rankings-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 15rem;
		gap: 2.75rem;
		align-items: start;
	}
	.ranking-content {
		min-width: 0;
	}
	.ranking-content[aria-busy='true'] table {
		opacity: 0.5;
	}
	.loading-message {
		padding: 0.5rem 0;
		color: var(--gold);
		font-size: 0.8125rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
		font-variant-numeric: tabular-nums;
	}
	thead {
		background: hsl(var(--secondary) / 0.07);
		color: var(--muted);
		border-block: 1px solid var(--line);
	}
	thead th {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.05em;
		padding: 0.9rem 0.75rem;
		text-align: left;
	}
	thead th:first-child {
		width: 4.5rem;
	}
	thead th:nth-child(2) {
		width: auto;
	}
	thead .number-column {
		width: 5rem;
	}
	tbody tr {
		border-bottom: 1px solid var(--line);
	}
	tbody tr:hover {
		background: hsl(var(--secondary) / 0.035);
	}
	tbody td,
	tbody th {
		padding: 1rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 400;
		text-align: left;
	}
	.number-column {
		text-align: right;
	}
	thead .number-column {
		text-align: right;
	}
	.rank {
		font: 1.1rem var(--serif);
		color: var(--muted);
	}
	.rank > span {
		display: inline-grid;
		place-items: center;
		width: 2rem;
		min-height: 2rem;
	}
	.top-rank .rank {
		color: var(--gold);
	}
	.rank-seal {
		border: 1px solid hsl(var(--secondary) / 0.4);
		background: hsl(var(--secondary) / 0.06);
	}
	.player-cell {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.player-initial {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 2.2rem;
		height: 2.2rem;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		font: 1rem var(--serif);
		color: var(--gold);
		background: hsl(var(--secondary) / 0.04);
	}
	.player-name {
		overflow-wrap: anywhere;
		line-height: 1.65;
	}
	.wins {
		color: var(--gold);
		font-weight: 600;
		font-size: 1rem;
	}
	.games,
	.win-rate {
		color: var(--muted);
	}
	.win-rate small {
		font-size: 0.625rem;
	}
	.table-footer {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
		margin-top: 1rem;
		color: var(--muted);
		font-size: 0.6875rem;
	}
	.pagination {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		font-variant-numeric: tabular-nums;
	}
	.pagination a,
	.pagination [aria-disabled] {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 1px solid var(--line);
		border-radius: 0.2rem;
	}
	.pagination [aria-disabled] {
		opacity: 0.35;
	}
	.pagination a:hover {
		background: hsl(var(--secondary) / 0.1);
	}
	.ranking-rules {
		padding: 1.25rem 0 0 1.25rem;
		border-top: 1px solid var(--line);
		border-left: 1px solid var(--line);
	}
	.ranking-rules .eyebrow {
		font-size: 0.625rem;
	}
	.ranking-rules h3 {
		font-size: 1.15rem;
		margin-top: 0.5rem;
	}
	.ranking-rules ol {
		padding-left: 1rem;
		margin: 1.5rem 0;
	}
	.ranking-rules li {
		padding-left: 0.25rem;
		margin-bottom: 1.2rem;
	}
	.ranking-rules li::marker {
		color: var(--gold);
		font: 0.75rem var(--serif);
	}
	.ranking-rules strong {
		font-size: 0.8125rem;
		font-weight: 500;
	}
	.ranking-rules li p,
	.update-note {
		color: var(--muted);
		line-height: 1.9;
		font-size: 0.75rem;
		margin-top: 0.4rem;
	}
	.update-note {
		padding-top: 1rem;
		border-top: 1px solid var(--line);
	}
	.empty-state {
		text-align: center;
		border-block: 1px solid var(--line);
		padding: 3rem 1rem;
	}
	.empty-mark {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3.5rem;
		border: 1px solid var(--line);
		margin: 0 auto 1.5rem;
		color: var(--gold);
		font: 2rem var(--serif);
	}
	.empty-state h3 {
		font-size: 1.3rem;
	}
	.empty-state p {
		color: var(--muted);
		font-size: 0.8125rem;
		line-height: 1.9;
		margin-top: 1rem;
	}
	.start-link {
		display: inline-flex;
		gap: 1.2rem;
		margin-top: 1.5rem;
		padding: 0.75rem 1rem;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border-radius: 0.25rem;
		font-size: 0.8125rem;
	}
	.start-link:hover {
		color: hsl(var(--primary-foreground));
		background: hsl(1 60% 47%);
	}
	.role-honors-section {
		margin-top: 4rem;
	}
	.section-note {
		color: var(--muted);
		font-size: 0.75rem;
	}
	.honors-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1rem;
	}
	.role-honor {
		display: flex;
		flex-direction: column;
		padding: 1.4rem;
		border: 1px solid var(--line);
		border-radius: 0.25rem;
		background: linear-gradient(145deg, hsl(35 15% 15%), hsl(25 10% 10%));
	}
	.role-honor:hover {
		color: var(--ink);
		border-color: hsl(var(--secondary) / 0.55);
		background: hsl(32 15% 15%);
	}
	.award-heading {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-bottom: 1.5rem;
	}
	.award-seal {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2.3rem;
		font: 1.3rem var(--serif);
		border: 1px solid hsl(var(--secondary) / 0.4);
		color: var(--gold);
	}
	.camp-label {
		font-size: 0.5625rem;
		color: #ce9c88;
		letter-spacing: 0.05em;
	}
	.bad-camp {
		color: #afa599;
	}
	.award-arrow {
		margin-left: auto;
		color: var(--gold);
		font-size: 0.85rem;
	}
	.award-role {
		font-size: 0.6875rem;
		color: var(--muted);
		letter-spacing: 0.14em;
	}
	.role-honor h3 {
		font-size: 1.5rem;
		color: var(--gold);
		letter-spacing: 0.08em;
		margin-top: 0.4rem;
	}
	.award-comment {
		color: var(--muted);
		font-family: var(--serif);
		font-size: 0.75rem;
		line-height: 1.9;
		margin-block: 0.7rem 1.5rem;
	}
	.award-winners {
		position: relative;
		border-top: 1px solid var(--line);
		padding: 1rem 2.5rem 0 0;
		margin-top: auto;
	}
	.winner-label {
		display: block;
		color: var(--muted);
		font-size: 0.5625rem;
	}
	.award-winners strong {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.7;
		overflow-wrap: anywhere;
		margin-top: 0.4rem;
	}
	.award-count {
		position: absolute;
		top: 1.25rem;
		right: 0;
		color: var(--gold);
		font: 1.1rem var(--serif);
		font-variant-numeric: tabular-nums;
	}
	.award-count small {
		font: 0.5625rem sans-serif;
	}
	.muted {
		color: var(--muted);
	}
	@media (max-width: 1050px) {
		.hero {
			gap: 2rem;
		}
		.rankings-layout {
			grid-template-columns: minmax(0, 1fr);
			gap: 2rem;
		}
		.ranking-rules {
			padding-left: 0;
			border-left: 0;
		}
		.ranking-rules ol {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 2rem;
		}
		.honors-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 700px) {
		.leaderboard-page {
			width: calc(100% - 2.5rem);
			padding-top: 2.5rem;
		}
		.hero {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		h1 {
			font-size: 2rem;
		}
		.hero-links {
			margin-top: 1rem;
		}
		.honor-feature {
			padding: 1.5rem;
			grid-template-columns: 3.75rem 1fr;
			gap: 1rem;
		}
		.honor-seal {
			width: 3.75rem;
			height: 4.25rem;
			font-size: 2.3rem;
		}
		.honor-copy h2 {
			font-size: 1.5rem;
		}
		.honor-comment {
			font-size: 0.6875rem;
		}
		.stats-strip {
			gap: 0.75rem;
			margin-top: 2rem;
			grid-template-columns: repeat(3, 1fr);
		}
		.stats-strip > div + div {
			padding-left: 0.75rem;
		}
		.stats-strip dd {
			font-size: 1.5rem;
		}
		.stats-strip dt {
			font-size: 0.625rem;
		}
		.stats-strip small {
			margin-left: 0.3rem;
			font-size: 0.625rem;
		}
		.scope-note {
			display: none;
		}
		.rankings-section {
			margin-top: 2.5rem;
		}
		.section-heading h2 {
			font-size: 1.6rem;
		}
		.role-navigation {
			gap: 0.25rem;
		}
		.role-navigation a {
			font-size: 0.6875rem;
			padding: 0.65rem 0.6rem;
		}
		thead th {
			padding: 0.8rem 0.35rem;
			font-size: 0.625rem;
		}
		thead th:first-child {
			width: 2.75rem;
		}
		thead .number-column {
			width: 2.75rem;
		}
		thead th:last-child {
			width: 3.5rem;
		}
		tbody td,
		tbody th {
			padding: 0.9rem 0.35rem;
			font-size: 0.75rem;
		}
		.player-initial {
			display: none;
		}
		.rank {
			font-size: 0.9rem;
		}
		.rank > span {
			width: 1.75rem;
			min-height: 1.75rem;
		}
		.wins {
			font-size: 0.875rem;
		}
		.table-footer {
			font-size: 0.625rem;
			gap: 0.5rem;
		}
		.pagination {
			gap: 0.45rem;
		}
		.ranking-rules ol {
			display: block;
		}
		.ranking-rules li {
			margin-bottom: 0.8rem;
		}
		.role-honors-section {
			margin-top: 3rem;
		}
		.role-honors-section .section-heading {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
		.honors-grid {
			gap: 0.75rem;
		}
		.role-honor {
			padding: 1rem;
		}
		.award-heading {
			gap: 0.4rem;
			margin-bottom: 1.1rem;
		}
		.award-seal {
			width: 1.7rem;
			height: 2rem;
			font-size: 1.15rem;
		}
		.camp-label {
			font-size: 0.5rem;
			letter-spacing: 0;
		}
		.award-arrow {
			font-size: 0.75rem;
		}
		.role-honor h3 {
			font-size: 1.2rem;
			letter-spacing: 0.02em;
		}
		.award-comment {
			font-size: 0.6875rem;
		}
		.award-winners {
			padding-right: 1.75rem;
		}
		.award-count {
			font-size: 0.9rem;
		}
		.award-winners strong {
			font-size: 0.6875rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		a {
			transition: none;
		}
	}
</style>
