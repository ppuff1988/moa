<script lang="ts">
	import { addNotification } from '$lib/stores/notifications';
	import { getSocket } from '$lib/utils/socket';
	import { onDestroy, onMount } from 'svelte';

	interface Player {
		id: number | string;
		userId: number;
		nickname: string;
		colorCode?: string;
		roleName?: string | null;
		isHost?: boolean;
	}

	interface CurrentUser {
		id: number;
		nickname: string;
	}

	export let roomName: string;
	export let players: Player[] = [];
	export let currentUser: CurrentUser | null = null;

	let selectedLaoChaoFeng: number | null = null;
	let selectedXuYuan: number | null = null;
	let selectedFangZhen: number | null = null;
	let hasVoted = false;
	let votedCount = 0;
	let totalEligibleVoters = players.length;
	let allPlayersVoted = false;
	let isPublishing = false;
	let phaseElement: HTMLDivElement | null = null;

	// 根據當前角色決定可以投票的對象
	$: currentPlayerRole = players.find((p) => p.userId === currentUser?.id)?.roleName;
	$: currentPlayer = players.find((p) => p.userId === currentUser?.id);
	$: isHost = currentPlayer?.isHost || false;
	$: canVoteLaoChaoFeng =
		currentPlayerRole &&
		['許愿', '黃煙煙', '方震', '木戶加奈', '姬云浮'].includes(currentPlayerRole);
	$: canVoteXuYuan = currentPlayerRole === '老朝奉';
	$: canVoteFangZhen = currentPlayerRole === '藥不然';
	$: zhengGuoQuRole = currentPlayerRole === '鄭國渠';

	// 過濾掉自己的玩家列表（用於投票選項）
	$: otherPlayers = players.filter((p) => p.userId !== currentUser?.id);

	// 獲取投票狀態
	const fetchVotingStatus = async () => {
		try {
			const response = await fetch(
				`/api/room/${encodeURIComponent(roomName)}/identification-status`,
				{
					credentials: 'include'
				}
			);

			if (response.ok) {
				const data = await response.json();
				votedCount = data.votedCount;
				totalEligibleVoters = data.totalEligibleVoters;
				hasVoted = data.hasVoted;
				allPlayersVoted = data.allVoted;
			}
		} catch (error) {
			console.error('獲取投票狀態錯誤:', error);
		}
	};

	const submitIdentification = async () => {
		const votes: Record<string, number> = {};
		if (selectedLaoChaoFeng) votes.laoChaoFeng = selectedLaoChaoFeng;
		if (selectedXuYuan) votes.xuYuan = selectedXuYuan;
		if (selectedFangZhen) votes.fangZhen = selectedFangZhen;

		try {
			const response = await fetch(
				`/api/room/${encodeURIComponent(roomName)}/submit-identification`,
				{
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ votes })
				}
			);

			if (response.ok) {
				const data = await response.json();
				hasVoted = true;
				votedCount = data.votedCount;
				totalEligibleVoters = data.totalEligibleVoters;
				addNotification('已提交鑑人投票', 'success');
			} else {
				const error = await response.json();
				addNotification(error.message || '提交失敗', 'error');
			}
		} catch (error) {
			console.error('提交鑑人投票錯誤:', error);
			addNotification('提交失敗，請檢查網路連接', 'error');
		}
	};

	const publishResults = async () => {
		isPublishing = true;

		try {
			const response = await fetch(
				`/api/room/${encodeURIComponent(roomName)}/publish-identification`,
				{
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);

			if (!response.ok) {
				const error = await response.json();
				addNotification(error.message || '公布失敗', 'error');
				isPublishing = false;
			}
		} catch (error) {
			console.error('公布結果錯誤:', error);
			addNotification('公布失敗，請檢查網路連接', 'error');
			isPublishing = false;
		}
	};

	onMount(() => {
		// 自動滾動到鑑人階段
		if (phaseElement) {
			setTimeout(() => {
				phaseElement?.scrollIntoView({
					behavior: 'smooth',
					block: 'start'
				});
			}, 100);
		}

		const socket = getSocket();
		if (!socket) return;

		socket.on(
			'player-voted-identification',
			(data: { votedCount: number; totalEligibleVoters: number; playerId: number }) => {
				votedCount = data.votedCount;
				totalEligibleVoters = data.totalEligibleVoters;

				// 檢查是否所有人都投票了
				if (data.votedCount >= data.totalEligibleVoters) {
					allPlayersVoted = true;
				}

				addNotification(
					`有玩家完成投票 (${data.votedCount}/${data.totalEligibleVoters})`,
					'info',
					2000
				);
			}
		);

		socket.on('all-players-voted-identification', (data: { message: string }) => {
			allPlayersVoted = true;
			addNotification(data.message, 'success', 4000);
		});

		// 初始化時獲取投票狀態
		fetchVotingStatus();
	});

	onDestroy(() => {
		const socket = getSocket();
		if (!socket) return;

		socket.off('player-voted-identification');
		socket.off('all-players-voted-identification');
	});
</script>

<div class="identification-phase" bind:this={phaseElement}>
	<div class="phase-header">
		<h3>🔍 鑑人階段</h3>
		<p class="phase-description">並未找出全部真品，投票找出目標角色</p>
		<div class="vote-progress">
			<span>投票進度: {votedCount} / {totalEligibleVoters}</span>
			{#if allPlayersVoted && isHost}
				<span class="all-voted-badge">✓ 全員已投票</span>
			{/if}
		</div>
	</div>

	{#if !hasVoted && !zhengGuoQuRole}
		<div class="voting-section">
			{#if canVoteLaoChaoFeng}
				<div class="vote-group">
					<div class="vote-header">
						<h4>許愿陣營：找出老朝奉</h4>
						<p class="vote-hint">需過半數票選才能成功找出 (+1分)</p>
					</div>
					<div class="player-selection">
						{#each otherPlayers as player (player.id)}
							<button
								class="player-btn-inline"
								class:selected={selectedLaoChaoFeng === player.id}
								on:click={() => (selectedLaoChaoFeng = Number(player.id))}
							>
								<span class="player-dot" style:background-color={player.colorCode || '#888'}></span>
								<span class="player-name">{player.nickname}</span>
								<span class="select-icon">{selectedLaoChaoFeng === player.id ? '✓' : ''}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if canVoteXuYuan}
				<div class="vote-group">
					<div class="vote-header">
						<h4>老朝奉：找出許愿</h4>
						<p class="vote-hint">找出許愿則老朝奉不失分，否則許愿陣營 +2分</p>
					</div>
					<div class="player-selection">
						{#each otherPlayers as player (player.id)}
							<button
								class="player-btn-inline"
								class:selected={selectedXuYuan === player.id}
								on:click={() => (selectedXuYuan = Number(player.id))}
							>
								<span class="player-dot" style:background-color={player.colorCode || '#888'}></span>
								<span class="player-name">{player.nickname}</span>
								<span class="select-icon">{selectedXuYuan === player.id ? '✓' : ''}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if canVoteFangZhen}
				<div class="vote-group">
					<div class="vote-header">
						<h4>藥不然：找出方震</h4>
						<p class="vote-hint">找出方震則藥不然不失分，否則許愿陣營 +1分</p>
					</div>
					<div class="player-selection">
						{#each otherPlayers as player (player.id)}
							<button
								class="player-btn-inline"
								class:selected={selectedFangZhen === player.id}
								on:click={() => (selectedFangZhen = Number(player.id))}
							>
								<span class="player-dot" style:background-color={player.colorCode || '#888'}></span>
								<span class="player-name">{player.nickname}</span>
								<span class="select-icon">{selectedFangZhen === player.id ? '✓' : ''}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- 如果沒有任何投票權限，顯示提示 -->
			{#if !canVoteLaoChaoFeng && !canVoteXuYuan && !canVoteFangZhen}
				<div class="no-vote-rights">
					<p>⚠️ 您的角色在鑑人階段沒有投票權</p>
					<p class="hint-text">當前角色: {currentPlayerRole || '未分配角色'}</p>
					<p class="hint-text">請等待其他玩家完成投票...</p>
				</div>
			{/if}

			<button
				class="submit-btn"
				on:click={submitIdentification}
				disabled={!selectedLaoChaoFeng && !selectedXuYuan && !selectedFangZhen}
			>
				提交鑑人投票
			</button>
		</div>
	{:else if zhengGuoQuRole}
		<div class="waiting-message">
			<p>🎭 鄭國渠在鑑人階段沒有投票權</p>
			<p class="hint-text">等待其他玩家完成投票...</p>
		</div>
	{:else}
		<div class="waiting-message">
			<p>✅ 已提交投票，等待其他玩家...</p>
			<p class="vote-status">當前進度: {votedCount} / {totalEligibleVoters}</p>
		</div>
	{/if}

	{#if isHost && allPlayersVoted}
		<div class="host-actions">
			<button class="publish-btn" on:click={publishResults} disabled={isPublishing}>
				{isPublishing ? '公布中...' : '🎉 公布鑑人結果'}
			</button>
			<p class="host-hint">所有玩家已完成投票，點擊按鈕公布最終結果</p>
		</div>
	{/if}
</div>

<style>
	.identification-phase {
		padding: 2rem;
		background: transparent;
		border-radius: 1rem;
	}

	.phase-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.phase-header h3 {
		color: hsl(var(--foreground));
		font-size: 1.875rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.phase-description {
		color: hsl(var(--muted-foreground));
		font-size: 0.95rem;
		margin-bottom: 1rem;
	}

	.vote-progress {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: hsl(var(--muted-foreground));
		font-size: 0.95rem;
	}

	.all-voted-badge {
		background: #22c55e;
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.voting-section {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.vote-group {
		padding: 1.5rem;
		border-radius: 0.75rem;
	}

	.vote-header {
		margin-bottom: 1.25rem;
	}

	.vote-group h4 {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.vote-hint {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		margin: 0;
	}

	.player-selection {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
		padding: 0.5rem 0;
	}

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

	.player-btn-inline.selected {
		background: rgba(212, 175, 55, 0.15);
		border-color: rgba(212, 175, 55, 0.8);
		box-shadow: 0 0 12px rgba(212, 175, 55, 0.4);
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
		text-align: left;
		font-weight: 500;
	}

	.select-icon {
		color: #d4af37;
		font-size: 1.25rem;
		font-weight: 700;
		min-width: 1.25rem;
		text-align: center;
		opacity: 0;
		transition: all 0.2s ease;
	}

	.player-btn-inline.selected .select-icon {
		opacity: 1;
	}

	.submit-btn {
		margin-top: 1rem;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-size: 1.125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
		width: 100%;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.waiting-message {
		text-align: center;
		padding: 3rem 2rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.75rem;
	}

	.waiting-message p {
		color: hsl(var(--foreground));
		font-size: 1.25rem;
		margin: 0.5rem 0;
	}

	.hint-text {
		color: hsl(var(--muted-foreground));
		font-size: 1rem !important;
	}

	.vote-status {
		color: #fbbf24 !important;
		font-weight: 600;
	}

	.host-actions {
		margin-top: 2rem;
		padding: 1.5rem;
		background: rgba(34, 197, 94, 0.1);
		border: 2px solid rgba(34, 197, 94, 0.3);
		border-radius: 0.75rem;
		text-align: center;
	}

	.publish-btn {
		padding: 1rem 2.5rem;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-size: 1.25rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s;
		margin-bottom: 0.75rem;
	}

	.publish-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(34, 197, 94, 0.4);
	}

	.publish-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.host-hint {
		color: hsl(var(--muted-foreground));
		font-size: 0.95rem;
		margin: 0;
	}

	.no-vote-rights {
		text-align: center;
		padding: 2rem;
		background: rgba(251, 191, 36, 0.1);
		border: 2px solid rgba(251, 191, 36, 0.3);
		border-radius: 0.75rem;
	}

	.no-vote-rights p {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		margin: 0.5rem 0;
	}

	/* 手機版響應式樣式 */
	@media (max-width: 768px) {
		.identification-phase {
			padding: 1rem;
		}

		.phase-header h3 {
			font-size: 1.5rem;
		}

		.vote-group {
			padding: 1rem;
		}

		.vote-group h4 {
			font-size: 1rem;
		}

		.vote-hint {
			font-size: 0.8rem;
		}

		.player-selection {
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

		.select-icon {
			font-size: 1rem;
		}

		.submit-btn {
			font-size: 1rem;
			padding: 0.875rem 1.5rem;
		}

		.waiting-message {
			padding: 2rem 1rem;
		}

		.waiting-message p {
			font-size: 1rem;
		}

		.host-actions {
			padding: 1rem;
		}

		.publish-btn {
			font-size: 1rem;
			padding: 0.875rem 1.5rem;
		}

		.no-vote-rights {
			padding: 1.5rem 1rem;
		}

		.no-vote-rights p {
			font-size: 1rem;
		}
	}
</style>
