<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let isOpen: boolean = false;
	export let onClose: () => void;

	interface UserStats {
		totalGames: number;
		totalWins: number;
		winRate: number;
		xuYuanWins: number;
		laoChaoFengWins: number;
		roleStats: Array<{ name: string; count: number }>;
		recentGames: Array<{
			gameId: string;
			roleName: string;
			camp: string;
			result: string;
			score: number;
			finishedAt: string | null;
		}>;
	}

	let stats: UserStats | null = null;
	let isLoading = true;
	let error = '';
	let portalTarget: HTMLElement | null = null;
	let modalContainer: HTMLDivElement | null = null;

	async function loadStats() {
		isLoading = true;
		error = '';

		try {
			const response = await fetch('/api/user/stats', {
				credentials: 'include'
			});

			if (response.ok) {
				stats = await response.json();
			} else {
				error = '無法載入戰績資料';
			}
		} catch (err) {
			console.error('載入戰績失敗:', err);
			error = '載入戰績時發生錯誤';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		// 創建 portal target 在 body 的最外層
		portalTarget = document.createElement('div');
		portalTarget.id = 'user-stats-modal-portal';
		portalTarget.style.cssText =
			'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;';
		document.body.appendChild(portalTarget);

		if (isOpen) {
			loadStats();
		}

		return () => {
			if (portalTarget && document.body.contains(portalTarget)) {
				document.body.removeChild(portalTarget);
			}
			// 清理時恢復滾動
			document.body.style.overflow = '';
		};
	});

	onDestroy(() => {
		if (portalTarget && document.body.contains(portalTarget)) {
			document.body.removeChild(portalTarget);
		}
		// 確保恢復滾動
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
		}
	});

	$: if (typeof document !== 'undefined') {
		if (isOpen) {
			loadStats();
			// 防止背景滾動
			document.body.style.overflow = 'hidden';
		} else {
			// 恢復背景滾動
			document.body.style.overflow = '';
		}
	}

	// Portal 功能：將 modal 容器添加到 portal target
	$: if (portalTarget && modalContainer) {
		if (isOpen) {
			portalTarget.appendChild(modalContainer);
		} else if (modalContainer.parentElement === portalTarget) {
			portalTarget.removeChild(modalContainer);
		}
	}

	function formatDate(dateString: string | null): string {
		if (!dateString) return '未知';
		const date = new Date(dateString);
		return date.toLocaleDateString('zh-TW', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleTouchMove(event: TouchEvent) {
		// 防止背景滾動
		const target = event.target as HTMLElement;
		const modalContent = target.closest('.modal-content');

		if (!modalContent) {
			event.preventDefault();
		}
	}
</script>

<div bind:this={modalContainer} style="display: {isOpen ? 'block' : 'none'};">
	{#if isOpen}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="modal-backdrop" on:click={handleBackdropClick} on:touchmove={handleTouchMove}>
			<div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="history-title">
				<header class="modal-header">
					<div>
						<p class="modal-eyebrow">個人檔案</p>
						<h2 id="history-title">歷史戰績</h2>
					</div>
					<button class="close-btn" on:click={onClose} aria-label="關閉">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</header>

				<div class="modal-content">
					{#if isLoading}
						<div class="loading" role="status" aria-label="正在載入歷史戰績">
							<div class="skeleton skeleton-hero"></div>
							<div class="skeleton skeleton-line"></div>
							<div class="skeleton skeleton-line short"></div>
							<span>載入戰績中</span>
						</div>
					{:else if error}
						<div class="error-message" role="alert">
							<span aria-hidden="true">×</span>
							<p>{error}</p>
							<button on:click={loadStats}>重新載入</button>
						</div>
					{:else if stats}
						<section class="performance-overview" aria-labelledby="performance-title">
							<div class="win-rate-panel" aria-label={`整體勝率 ${stats.winRate}%`}>
								<div>
									<p>整體勝率</p>
									<h3 id="performance-title">生涯表現</h3>
								</div>
								<strong>{stats.winRate}<span>%</span></strong>
								<div
									class="win-rate-track"
									role="progressbar"
									aria-label="勝率"
									aria-valuenow={stats.winRate}
									aria-valuemin="0"
									aria-valuemax="100"
								>
									<span style:width={`${stats.winRate}%`}></span>
								</div>
							</div>
							<dl class="record-ledger">
								<div>
									<dt>完成對局</dt>
									<dd>{stats.totalGames} 場</dd>
								</div>
								<div>
									<dt>累計勝場</dt>
									<dd>{stats.totalWins} 勝</dd>
								</div>
							</dl>
						</section>

						<section class="stats-section" aria-labelledby="camp-record-title">
							<header class="section-heading">
								<span>01</span>
								<div>
									<p>紅黑雙方</p>
									<h3 id="camp-record-title">陣營勝場</h3>
								</div>
							</header>
							<div class="camp-grid">
								<article class="camp-item" data-faction-color="red">
									<span class="camp-emblem" aria-hidden="true">👼</span>
									<div>
										<small>紅方</small>
										<h4>許愿陣營</h4>
									</div>
									<strong>{stats.xuYuanWins}<span>勝</span></strong>
								</article>
								<article class="camp-item" data-faction-color="black">
									<span class="camp-emblem" aria-hidden="true">😈</span>
									<div>
										<small>黑方</small>
										<h4>老朝奉陣營</h4>
									</div>
									<strong>{stats.laoChaoFengWins}<span>勝</span></strong>
								</article>
							</div>
						</section>

						<section class="stats-section" aria-labelledby="role-record-title">
							<header class="section-heading">
								<span>02</span>
								<div>
									<p>出場次數</p>
									<h3 id="role-record-title">角色使用</h3>
								</div>
							</header>
							{#if stats.roleStats.length > 0}
								<ol class="role-list">
									{#each stats.roleStats as role, roleIndex (role.name)}
										<li class="role-row">
											<span class="role-rank">{String(roleIndex + 1).padStart(2, '0')}</span>
											<span class="role-name">{role.name}</span>
											<div class="role-bar-bg" aria-label={`${role.name}出場 ${role.count} 次`}>
												<span style:width={`${(role.count / stats.totalGames) * 100}%`}></span>
											</div>
											<span class="role-count">{role.count} 次</span>
										</li>
									{/each}
								</ol>
							{:else}
								<div class="empty">
									<span aria-hidden="true">—</span>
									<p>尚無角色使用資料</p>
								</div>
							{/if}
						</section>

						<section class="stats-section recent-section" aria-labelledby="recent-record-title">
							<header class="section-heading">
								<span>03</span>
								<div>
									<p>最近五場</p>
									<h3 id="recent-record-title">對局紀錄</h3>
								</div>
							</header>
							{#if stats.recentGames.length > 0}
								<ol class="game-list">
									{#each stats.recentGames as game (game.gameId)}
										<li
											class="game-item"
											class:win={game.result === '勝利'}
											data-faction={game.camp === '許愿陣營' ? 'red' : 'black'}
										>
											<span class="result-badge" class:victory={game.result === '勝利'}
												>{game.result}</span
											>
											<div class="game-details">
												<div class="game-role">
													<strong>{game.roleName}</strong><span>{game.score} 分</span>
												</div>
												<div class="game-meta">
													<span class="game-camp">{game.camp}</span>
												</div>
											</div>
											<time class="game-date" datetime={game.finishedAt || undefined}
												>{formatDate(game.finishedAt)}</time
											>
										</li>
									{/each}
								</ol>
							{:else}
								<div class="empty">
									<span aria-hidden="true">—</span>
									<p>尚無完成的遊戲記錄</p>
								</div>
							{/if}
						</section>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100dvh;
		padding: 1rem;
		background: rgba(10, 8, 6, 0.78);
		backdrop-filter: blur(10px);
		overscroll-behavior: contain;
		pointer-events: auto;
		touch-action: none;
		animation: fade-in 180ms ease-out;
	}

	.modal-container {
		--history-gold: #d6bc76;
		--history-gold-bright: #ead99f;
		--history-text: #f5efe6;
		--history-muted: #b9afa3;
		--history-line: rgba(214, 188, 118, 0.18);
		--faction-red: #a9433b;
		--faction-red-light: #dc887f;
		--faction-black: #0c0c0b;
		--faction-silver: #aaa39a;
		display: flex;
		flex-direction: column;
		width: min(100%, 58rem);
		max-height: min(90dvh, 58rem);
		overflow: hidden;
		color: var(--history-text);
		background:
			radial-gradient(circle at 12% 0%, rgba(162, 100, 54, 0.15), transparent 30%),
			linear-gradient(155deg, #292722 0%, #181714 100%);
		border: 1px solid rgba(214, 188, 118, 0.3);
		border-radius: 1rem 1rem 0.45rem 0.45rem;
		box-shadow:
			0 2rem 6rem rgba(7, 5, 3, 0.62),
			inset 0 1px 0 rgba(255, 248, 232, 0.07);
		overscroll-behavior: contain;
		touch-action: pan-y;
		animation: rise-in 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	@keyframes rise-in {
		from {
			opacity: 0;
			transform: translateY(0.8rem) scale(0.985);
		}
	}

	.modal-header {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: space-between;
		padding: 1.35rem clamp(1.25rem, 3vw, 2rem);
		background: rgba(255, 248, 232, 0.025);
		border-bottom: 1px solid var(--history-line);
	}

	.modal-eyebrow {
		margin: 0 0 0.25rem;
		color: var(--history-gold);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.16em;
	}

	h2 {
		margin: 0;
		color: var(--history-text);
		font-family: 'Noto Serif TC', 'Songti TC', 'Microsoft JhengHei', serif;
		font-size: clamp(1.35rem, 3vw, 1.75rem);
		font-weight: 600;
		letter-spacing: -0.03em;
	}

	.close-btn {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		color: #cfc5b8;
		background: rgba(255, 248, 232, 0.055);
		border: 1px solid rgba(255, 248, 232, 0.13);
		border-radius: 0.45rem;
		cursor: pointer;
		transition:
			color 180ms ease,
			background-color 180ms ease,
			border-color 180ms ease,
			transform 180ms ease;
	}

	.close-btn:hover {
		color: var(--history-text);
		background: rgba(214, 188, 118, 0.1);
		border-color: rgba(214, 188, 118, 0.4);
	}

	.close-btn:active {
		transform: scale(0.96);
	}
	.close-btn:focus-visible,
	.error-message button:focus-visible {
		outline: 2px solid var(--history-gold);
		outline-offset: 3px;
	}

	.modal-content {
		flex: 1;
		padding: clamp(1.25rem, 3vw, 2rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-color: rgba(214, 188, 118, 0.34) rgba(0, 0, 0, 0.18);
	}

	.loading {
		display: grid;
		gap: 0.75rem;
		padding: 1rem 0 3rem;
	}

	.loading > span {
		color: var(--history-muted);
		font-size: 0.75rem;
	}

	.skeleton {
		overflow: hidden;
		background: rgba(255, 248, 232, 0.06);
		border-radius: 0.4rem;
	}

	.skeleton::after {
		display: block;
		width: 45%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(214, 188, 118, 0.12), transparent);
		content: '';
		animation: skeleton-sweep 1.4s ease-in-out infinite;
	}

	.skeleton-hero {
		height: 12rem;
	}
	.skeleton-line {
		height: 3.5rem;
	}
	.skeleton-line.short {
		width: 72%;
	}

	@keyframes skeleton-sweep {
		from {
			transform: translateX(-120%);
		}
		to {
			transform: translateX(240%);
		}
	}

	.error-message {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 2rem;
		background: rgba(169, 67, 59, 0.08);
		border-left: 2px solid var(--faction-red);
		border-radius: 0.25rem 0.7rem 0.7rem 0.25rem;
	}

	.error-message > span {
		color: var(--faction-red-light);
		font-size: 1.5rem;
		line-height: 1;
	}

	.error-message p {
		margin: 0;
		color: #dfd4c7;
	}

	.error-message button {
		padding: 0.55rem 0.8rem;
		color: var(--history-text);
		background: transparent;
		border: 1px solid rgba(214, 188, 118, 0.32);
		border-radius: 0.35rem;
		cursor: pointer;
	}

	.performance-overview {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(13rem, 0.75fr);
		gap: 1px;
		margin-bottom: clamp(3rem, 6vw, 4.5rem);
		overflow: hidden;
		background: var(--history-line);
		border: 1px solid var(--history-line);
		border-radius: 0.45rem 1rem 0.45rem 0.45rem;
	}

	.win-rate-panel {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
		gap: 1rem;
		min-height: 11rem;
		padding: clamp(1.4rem, 3vw, 2rem);
		background:
			radial-gradient(circle at 0% 0%, rgba(174, 106, 55, 0.18), transparent 42%), #24211d;
	}

	.win-rate-panel p,
	.section-heading p {
		margin: 0;
		color: var(--history-gold);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.13em;
	}

	.win-rate-panel h3 {
		margin: 0.3rem 0 0;
		font-family: 'Noto Serif TC', 'Songti TC', 'Microsoft JhengHei', serif;
		font-size: clamp(1.25rem, 3vw, 1.8rem);
		font-weight: 600;
	}

	.win-rate-panel > strong {
		color: var(--history-gold-bright);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: clamp(3.5rem, 8vw, 5.5rem);
		font-weight: 600;
		letter-spacing: -0.1em;
		line-height: 0.85;
		font-variant-numeric: tabular-nums;
	}

	.win-rate-panel > strong span {
		margin-left: 0.15em;
		font-size: 0.28em;
		letter-spacing: 0;
	}

	.win-rate-track {
		grid-column: 1 / -1;
		height: 0.25rem;
		overflow: hidden;
		background: rgba(255, 248, 232, 0.1);
		border-radius: 999px;
	}

	.win-rate-track span {
		display: block;
		height: 100%;
		background: var(--history-gold);
		border-radius: inherit;
	}

	.record-ledger {
		display: grid;
		grid-template-rows: repeat(2, 1fr);
		margin: 0;
		background: #201e1a;
	}

	.record-ledger > div {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--history-line);
	}

	.record-ledger > div:last-child {
		border-bottom: 0;
	}
	.record-ledger dt {
		margin-bottom: 0.3rem;
		color: var(--history-muted);
		font-size: 0.7rem;
	}

	.record-ledger dd {
		margin: 0;
		color: var(--history-text);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 1.4rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.stats-section {
		margin-bottom: clamp(2.75rem, 5vw, 4rem);
	}
	.stats-section:last-child {
		margin-bottom: 0;
	}

	.section-heading {
		display: grid;
		grid-template-columns: 2.25rem minmax(0, 1fr);
		gap: 0.85rem;
		margin-bottom: 1.1rem;
		padding-bottom: 0.8rem;
		border-bottom: 1px solid var(--history-line);
	}

	.section-heading > span {
		padding-top: 0.15rem;
		color: rgba(214, 188, 118, 0.58);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.68rem;
	}

	.section-heading p {
		font-size: 0.65rem;
		letter-spacing: 0.12em;
	}
	.section-heading h3 {
		margin: 0.2rem 0 0;
		color: var(--history-text);
		font-family: 'Noto Serif TC', 'Songti TC', 'Microsoft JhengHei', serif;
		font-size: clamp(1.2rem, 2.5vw, 1.6rem);
		font-weight: 600;
		letter-spacing: -0.025em;
	}

	.camp-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.camp-item {
		display: grid;
		grid-template-columns: 2.6rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.85rem;
		min-width: 0;
		padding: 1rem;
		border-top: 3px solid transparent;
		border-radius: 0.3rem 0.3rem 0.75rem 0.75rem;
	}

	.camp-item[data-faction-color='red'] {
		background:
			radial-gradient(circle at 0% 0%, rgba(169, 67, 59, 0.2), transparent 42%),
			rgba(255, 248, 232, 0.045);
		border-top-color: var(--faction-red);
	}

	.camp-item[data-faction-color='black'] {
		background:
			radial-gradient(circle at 0% 0%, rgba(170, 163, 154, 0.11), transparent 42%),
			rgba(7, 7, 6, 0.44);
		border-top-color: var(--faction-black);
		box-shadow: inset 0 1px 0 rgba(170, 163, 154, 0.19);
	}

	.camp-emblem {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		font-size: 1.2rem;
		background: var(--faction-red);
		border: 1px solid rgba(226, 154, 145, 0.45);
		border-radius: 0.28rem;
		box-shadow: inset 0 0 0 0.3rem rgba(52, 10, 8, 0.14);
	}

	.camp-item[data-faction-color='black'] .camp-emblem {
		background: var(--faction-black);
		border-color: rgba(170, 163, 154, 0.42);
		box-shadow: inset 0 0 0 0.3rem rgba(255, 255, 255, 0.025);
	}

	.camp-item small {
		color: var(--faction-red-light);
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.1em;
	}

	.camp-item[data-faction-color='black'] small {
		color: var(--faction-silver);
	}
	.camp-item h4 {
		margin: 0.15rem 0 0;
		overflow: hidden;
		font-size: 0.88rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.camp-item > strong {
		display: flex;
		align-items: baseline;
		gap: 0.2rem;
		color: var(--history-text);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 1.6rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.camp-item > strong span {
		color: var(--history-muted);
		font-size: 0.65rem;
	}

	.role-list,
	.game-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.role-list {
		border-top: 1px solid rgba(255, 248, 232, 0.08);
	}
	.role-row {
		display: grid;
		grid-template-columns: 2rem minmax(5rem, 0.35fr) minmax(8rem, 1fr) 3.5rem;
		align-items: center;
		gap: 0.8rem;
		min-height: 3.25rem;
		border-bottom: 1px solid rgba(255, 248, 232, 0.08);
	}

	.role-rank {
		color: rgba(214, 188, 118, 0.52);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.65rem;
	}

	.role-name {
		overflow: hidden;
		color: var(--history-text);
		font-size: 0.82rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.role-bar-bg {
		height: 0.3rem;
		overflow: hidden;
		background: rgba(255, 248, 232, 0.08);
		border-radius: 999px;
	}

	.role-bar-bg span {
		display: block;
		height: 100%;
		background: var(--history-gold);
		border-radius: inherit;
		transition: width 260ms ease;
	}

	.role-count {
		color: var(--history-muted);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.68rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.game-list {
		position: relative;
	}
	.game-list::before {
		position: absolute;
		top: 1rem;
		bottom: 1rem;
		left: 2.1rem;
		width: 1px;
		background: rgba(214, 188, 118, 0.17);
		content: '';
	}

	.game-item {
		position: relative;
		display: grid;
		grid-template-columns: 4.25rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem;
		min-height: 5rem;
		padding: 0.85rem 0.9rem 0.85rem 0;
		border-bottom: 1px solid rgba(255, 248, 232, 0.08);
		transition: background-color 180ms ease;
	}

	.game-item:last-child {
		border-bottom: 0;
	}
	.game-item:hover {
		background: rgba(214, 188, 118, 0.045);
	}

	.result-badge {
		position: relative;
		z-index: 1;
		justify-self: center;
		min-width: 2.8rem;
		padding: 0.35rem 0.4rem;
		color: #d8a29b;
		background: #2b1e1b;
		border: 1px solid rgba(169, 67, 59, 0.4);
		border-radius: 0.25rem;
		font-size: 0.68rem;
		font-weight: 700;
		text-align: center;
	}

	.result-badge.victory {
		color: var(--history-gold-bright);
		background: #302819;
		border-color: rgba(214, 188, 118, 0.42);
	}

	.game-details {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
	}

	.game-role {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		min-width: 0;
	}

	.game-role strong {
		overflow: hidden;
		font-size: 0.9rem;
		font-weight: 650;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.game-role > span {
		flex: 0 0 auto;
		color: var(--history-gold-bright);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
	}

	.game-meta {
		color: var(--history-muted);
		font-size: 0.7rem;
	}

	.game-camp::before {
		display: inline-block;
		width: 0.45rem;
		height: 0.45rem;
		margin-right: 0.4rem;
		vertical-align: 0.02rem;
		background: var(--faction-red);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 0.1rem;
		content: '';
	}

	.game-item[data-faction='black'] .game-camp::before {
		background: var(--faction-black);
		border-color: rgba(170, 163, 154, 0.5);
	}

	.game-date {
		max-width: 10rem;
		color: #91887c;
		font-size: 0.68rem;
		line-height: 1.35;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.empty {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 5rem;
		padding: 1rem;
		color: var(--history-muted);
		background: rgba(255, 248, 232, 0.025);
		border-left: 2px solid rgba(214, 188, 118, 0.32);
	}

	.empty span {
		color: var(--history-gold);
		font-size: 1.2rem;
	}
	.empty p {
		margin: 0;
		font-size: 0.78rem;
	}

	@media (max-width: 720px) {
		.modal-backdrop {
			align-items: flex-end;
			padding: 0;
		}
		.modal-container {
			width: 100%;
			max-height: 92dvh;
			border-right: 0;
			border-bottom: 0;
			border-left: 0;
			border-radius: 1rem 1rem 0 0;
		}
		.modal-header {
			padding: 1rem 1.1rem;
		}
		.modal-content {
			padding: 1.1rem;
		}
		.performance-overview {
			grid-template-columns: 1fr;
			margin-bottom: 3rem;
		}
		.win-rate-panel {
			min-height: 9rem;
		}
		.record-ledger {
			grid-template-columns: repeat(2, 1fr);
			grid-template-rows: auto;
		}
		.record-ledger > div {
			padding: 1rem;
			border-right: 1px solid var(--history-line);
			border-bottom: 0;
		}
		.record-ledger > div:last-child {
			border-right: 0;
		}
		.camp-grid {
			grid-template-columns: 1fr;
		}
		.role-row {
			grid-template-columns: 1.5rem minmax(4.5rem, 0.55fr) minmax(5rem, 1fr) 3rem;
			gap: 0.5rem;
		}
		.game-item {
			grid-template-columns: 3.7rem minmax(0, 1fr);
			gap: 0.75rem;
		}
		.game-list::before {
			left: 1.85rem;
		}
		.game-date {
			grid-column: 2;
			max-width: none;
			margin-top: -0.35rem;
			text-align: left;
		}
	}

	@media (max-width: 430px) {
		.win-rate-panel {
			grid-template-columns: 1fr;
		}
		.win-rate-panel > strong {
			font-size: 3.75rem;
		}
		.role-row {
			grid-template-columns: 1.4rem minmax(0, 1fr) 3rem;
		}
		.role-bar-bg {
			display: none;
		}
		.camp-item {
			grid-template-columns: 2.4rem minmax(0, 1fr) auto;
		}
		.camp-emblem {
			width: 2.4rem;
			height: 2.4rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.modal-backdrop,
		.modal-container,
		.skeleton::after,
		.close-btn,
		.role-bar-bg span,
		.game-item {
			animation: none;
			transition: none;
		}
	}
</style>
