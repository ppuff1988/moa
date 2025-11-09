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
		// 創建 portal 容器（未使用，但保留供未來擴展）
		portalTarget = document.createElement('div');
		portalTarget.id = 'user-stats-modal-portal';
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
</script>

{#if isOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="modal-backdrop" on:click={handleBackdropClick}>
		<div class="modal-container">
			<!-- 標題 -->
			<div class="modal-header">
				<h2>戰績統計</h2>
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
			</div>

			<!-- 內容 -->
			<div class="modal-content">
				{#if isLoading}
					<div class="loading">
						<div class="spinner"></div>
						<p>載入中...</p>
					</div>
				{:else if error}
					<div class="error-message">
						<p>{error}</p>
					</div>
				{:else if stats}
					<!-- 總覽統計 -->
					<div class="stats-grid">
						<div class="stat-card">
							<div class="stat-label">總場次</div>
							<div class="stat-value">{stats.totalGames}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">勝場</div>
							<div class="stat-value highlight">{stats.totalWins}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">勝率</div>
							<div class="stat-value highlight">{stats.winRate}%</div>
						</div>
					</div>

					<!-- 陣營統計 -->
					<div class="section">
						<h3>陣營戰績</h3>
						<div class="camp-grid">
							<div class="camp-item xuyuan">
								<div class="camp-name">許愿陣營</div>
								<div class="camp-value">{stats.xuYuanWins} 勝</div>
							</div>
							<div class="camp-item laochaofeng">
								<div class="camp-name">老朝奉陣營</div>
								<div class="camp-value">{stats.laoChaoFengWins} 勝</div>
							</div>
						</div>
					</div>

					<!-- 角色統計 -->
					<div class="section">
						<h3>角色使用</h3>
						{#if stats.roleStats.length > 0}
							<div class="role-list">
								{#each stats.roleStats as role (role.name)}
									<div class="role-row">
										<span class="role-name">{role.name}</span>
										<div class="role-bar-bg">
											<div
												class="role-bar"
												style="width: {(role.count / stats.totalGames) * 100}%"
											></div>
										</div>
										<span class="role-count">{role.count}</span>
									</div>
								{/each}
							</div>
						{:else}
							<div class="empty">尚無角色資料</div>
						{/if}
					</div>

					<!-- 近期記錄 -->
					<div class="section">
						<h3>近期戰績</h3>
						{#if stats.recentGames.length > 0}
							<div class="game-list">
								{#each stats.recentGames as game (game.gameId)}
									<div class="game-item" class:win={game.result === '勝利'}>
										<div class="game-result">
											<span class="result-badge" class:victory={game.result === '勝利'}>
												{game.result === '勝利' ? '勝' : '敗'}
											</span>
										</div>
										<div class="game-details">
											<div class="game-role">{game.roleName}</div>
											<div class="game-meta">
												<span class="game-camp">{game.camp}</span>
												<span class="game-divider">•</span>
												<span class="game-score">{game.score} 分</span>
											</div>
										</div>
										<div class="game-date">{formatDate(game.finishedAt)}</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="empty">
								<p>尚無完成的遊戲記錄</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		animation: fadeIn 0.15s ease;
		padding: 1rem;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
	}

	.modal-container {
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		width: 100%;
		max-width: 700px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		animation: slideUp 0.2s ease;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.close-btn {
		background: transparent;
		border: none;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 6px;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
	}

	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	/* Loading */
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid hsl(var(--border));
		border-top-color: hsl(var(--primary));
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading p {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
	}

	/* Error */
	.error-message {
		padding: 3rem 2rem;
		text-align: center;
		color: hsl(var(--destructive));
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		background: transparent;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 1.25rem;
		text-align: center;
	}

	.stat-label {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin-bottom: 0.5rem;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: hsl(var(--foreground));
	}

	.stat-value.highlight {
		color: #22c55e;
	}

	/* Section */
	.section {
		margin-bottom: 1.5rem;
	}

	.section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		margin: 0 0 1rem 0;
	}

	/* Camp */
	.camp-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.camp-item {
		background: transparent;
		border: 2px solid hsl(var(--border));
		border-radius: 8px;
		padding: 1.25rem;
		text-align: center;
		transition: all 0.2s ease;
	}

	.camp-item:hover {
		transform: translateY(-2px);
	}

	.camp-item.xuyuan {
		border-color: #dc2626;
		background: rgba(220, 38, 38, 0.05);
	}

	.camp-item.laochaofeng {
		border-color: #6b7280;
		background: rgba(107, 114, 128, 0.05);
	}

	.camp-name {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin-bottom: 0.5rem;
		display: block;
		font-weight: 500;
	}

	.camp-item.xuyuan .camp-name {
		color: #dc2626;
	}

	.camp-item.laochaofeng .camp-name {
		color: #6b7280;
	}

	.camp-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: hsl(var(--foreground));
	}

	.camp-item.xuyuan .camp-value {
		color: #dc2626;
	}

	.camp-item.laochaofeng .camp-value {
		color: #4b5563;
	}

	/* Role List */
	.role-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.role-row {
		display: grid;
		grid-template-columns: 100px 1fr 50px;
		gap: 1rem;
		align-items: center;
		padding: 0.75rem;
		background: transparent;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
	}

	.role-name {
		font-weight: 500;
		color: hsl(var(--foreground));
	}

	.role-bar-bg {
		height: 8px;
		background: hsl(var(--muted));
		border-radius: 4px;
		overflow: hidden;
	}

	.role-bar {
		height: 100%;
		background: hsl(var(--primary));
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.role-count {
		text-align: right;
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		font-weight: 500;
	}

	/* Game List */
	.game-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.game-item {
		background: transparent;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 1rem;
		display: grid;
		grid-template-columns: 50px 1fr auto;
		gap: 1rem;
		align-items: center;
		transition: all 0.15s;
	}

	.game-item:hover {
		background: hsl(var(--accent) / 0.05);
		border-color: hsl(var(--primary) / 0.5);
	}

	.game-result {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.result-badge {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 700;
		background: #ef4444;
		color: white;
		line-height: 1;
		padding-top: 1px;
	}

	.result-badge.victory {
		background: #22c55e;
	}

	.game-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.game-role {
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.game-meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
	}

	.game-divider {
		color: hsl(var(--muted-foreground) / 0.5);
	}

	.game-date {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		text-align: right;
	}

	/* Empty */
	.empty {
		text-align: center;
		padding: 2rem;
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.modal-backdrop {
			padding: 0;
			align-items: flex-end;
		}

		.modal-container {
			max-height: 85vh;
			border-radius: 16px 16px 0 0;
			margin: 0;
		}

		.modal-header {
			padding: 1rem;
		}

		.modal-content {
			padding: 1rem;
		}

		h2 {
			font-size: 1.125rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
			margin-bottom: 1rem;
		}

		.stat-card {
			padding: 1rem;
		}

		.stat-value {
			font-size: 1.75rem;
		}

		.section {
			margin-bottom: 1rem;
		}

		.section h3 {
			font-size: 0.9rem;
			margin-bottom: 0.75rem;
		}

		.camp-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.camp-item {
			padding: 1rem;
		}

		.camp-value {
			font-size: 1.25rem;
		}

		.role-list {
			gap: 0.5rem;
		}

		.role-row {
			grid-template-columns: 80px 1fr 40px;
			gap: 0.75rem;
			padding: 0.625rem;
		}

		.role-name {
			font-size: 0.875rem;
		}

		.role-bar-bg {
			height: 6px;
		}

		.role-count {
			font-size: 0.8rem;
		}

		.game-list {
			gap: 0.5rem;
		}

		.game-item {
			grid-template-columns: 40px 1fr;
			gap: 0.75rem;
			padding: 0.75rem;
			align-items: center;
		}

		.game-result {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.result-badge {
			width: 32px;
			height: 32px;
			font-size: 0.75rem;
		}

		.game-role {
			font-size: 0.9rem;
		}

		.game-meta {
			font-size: 0.8rem;
			gap: 0.375rem;
		}

		.game-date {
			grid-column: 2;
			text-align: left;
			font-size: 0.7rem;
			margin-top: 0.25rem;
		}

		.empty {
			padding: 1.5rem;
			font-size: 0.8rem;
		}
	}
</style>
