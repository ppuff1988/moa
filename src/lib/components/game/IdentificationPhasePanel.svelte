<script lang="ts">
	import { getJWTToken } from '$lib/utils/jwt';
	import { addNotification } from '$lib/stores/notifications';
	import { onMount, onDestroy } from 'svelte';
	import { getSocket } from '$lib/utils/socket';

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
	export let genuineScore: number = 0;

	let selectedLaoChaoFeng: number | null = null;
	let selectedXuYuan: number | null = null;
	let selectedFangZhen: number | null = null;
	let hasVoted = false;
	let votedCount = 0;
	let totalEligibleVoters = players.length;
	let allPlayersVoted = false;
	let isPublishing = false;

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

	// Debug: 檢查當前玩家和角色資訊
	$: {
		console.log('鑑人階段 - 當前玩家:', currentPlayer);
		console.log('鑑人階段 - 當前角色:', currentPlayerRole);
		console.log('鑑人階段 - 可投老朝奉:', canVoteLaoChaoFeng);
		console.log('鑑人階段 - 可投許愿:', canVoteXuYuan);
		console.log('鑑人階段 - 可投方震:', canVoteFangZhen);
		console.log('鑑人階段 - 是鄭國渠:', zhengGuoQuRole);
		console.log('鑑人階段 - 其他玩家數量:', otherPlayers.length);
	}

	// 獲取投票狀態
	const fetchVotingStatus = async () => {
		const token = getJWTToken();
		if (!token) return;

		try {
			const response = await fetch(
				`/api/room/${encodeURIComponent(roomName)}/identification-status`,
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			if (response.ok) {
				const data = await response.json();
				votedCount = data.votedCount;
				totalEligibleVoters = data.totalEligibleVoters;
				hasVoted = data.hasVoted;
				allPlayersVoted = data.allVoted;
				console.log('投票狀態已更新:', {
					votedCount,
					totalEligibleVoters,
					hasVoted,
					allPlayersVoted
				});
			}
		} catch (error) {
			console.error('獲取投票狀態錯誤:', error);
		}
	};

	const submitIdentification = async () => {
		const token = getJWTToken();
		if (!token) return;

		const votes: Record<string, number> = {};
		if (selectedLaoChaoFeng) votes.laoChaoFeng = selectedLaoChaoFeng;
		if (selectedXuYuan) votes.xuYuan = selectedXuYuan;
		if (selectedFangZhen) votes.fangZhen = selectedFangZhen;

		try {
			const response = await fetch(
				`/api/room/${encodeURIComponent(roomName)}/submit-identification`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
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
		const token = getJWTToken();
		if (!token) return;

		isPublishing = true;

		try {
			const response = await fetch(
				`/api/room/${encodeURIComponent(roomName)}/publish-identification`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (response.ok) {
				addNotification('已公布鑑人結果', 'success');
			} else {
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
		const socket = getSocket();
		if (!socket) return;

		socket.on(
			'player-voted-identification',
			(data: { votedCount: number; totalEligibleVoters: number; playerId: number }) => {
				votedCount = data.votedCount;
				totalEligibleVoters = data.totalEligibleVoters;
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

<div class="identification-phase">
	<div class="phase-header">
		<h3>🔍 鑑人階段</h3>
		<p class="score-info">真品得分: <strong>{genuineScore}</strong> / 6</p>
		<div class="vote-progress">
			<span>投票進度: {votedCount} / {totalEligibleVoters}</span>
			{#if allPlayersVoted && isHost}
				<span class="all-voted-badge">✓ 全員已投票</span>
			{/if}
		</div>
	</div>

	<!-- Debug 資訊區域 -->
	{#if !hasVoted && !zhengGuoQuRole}
		<div class="debug-info">
			<p style="color: #fbbf24; font-size: 0.875rem; margin-bottom: 0.5rem;">
				當前角色: {currentPlayerRole || '未知'} | 可投票: {canVoteLaoChaoFeng ||
				canVoteXuYuan ||
				canVoteFangZhen
					? '是'
					: '否'}
			</p>
		</div>
	{/if}

	{#if !hasVoted && !zhengGuoQuRole}
		<div class="voting-section">
			{#if canVoteLaoChaoFeng}
				<div class="vote-group">
					<h4>許愿陣營：找出老朝奉</h4>
					<p class="vote-hint">需過半數票選才能成功找出 (+1分)</p>
					<div class="player-selection">
						{#each otherPlayers as player (player.id)}
							<label class="player-option">
								<input
									type="radio"
									name="laoChaoFeng"
									value={player.id}
									bind:group={selectedLaoChaoFeng}
								/>
								<span class="player-name" style="color: {player.colorCode}">{player.nickname}</span>
								{#if player.roleName}
									<span class="role-badge">{player.roleName}</span>
								{/if}
							</label>
						{/each}
					</div>
				</div>
			{/if}

			{#if canVoteXuYuan}
				<div class="vote-group">
					<h4>老朝奉：找出許愿</h4>
					<p class="vote-hint">找出許愿則老朝奉不失分，否則許愿陣營 +2分</p>
					<div class="player-selection">
						{#each otherPlayers as player (player.id)}
							<label class="player-option">
								<input type="radio" name="xuYuan" value={player.id} bind:group={selectedXuYuan} />
								<span class="player-name" style="color: {player.colorCode}">{player.nickname}</span>
								{#if player.roleName}
									<span class="role-badge">{player.roleName}</span>
								{/if}
							</label>
						{/each}
					</div>
				</div>
			{/if}

			{#if canVoteFangZhen}
				<div class="vote-group">
					<h4>藥不然：找出方震</h4>
					<p class="vote-hint">找出方震則藥不然不失分，否則許愿陣營 +1分</p>
					<div class="player-selection">
						{#each otherPlayers as player (player.id)}
							<label class="player-option">
								<input
									type="radio"
									name="fangZhen"
									value={player.id}
									bind:group={selectedFangZhen}
								/>
								<span class="player-name" style="color: {player.colorCode}">{player.nickname}</span>
								{#if player.roleName}
									<span class="role-badge">{player.roleName}</span>
								{/if}
							</label>
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
		background: rgba(0, 0, 0, 0.3);
		border-radius: 1rem;
		backdrop-filter: blur(10px);
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

	.score-info {
		color: hsl(var(--muted-foreground));
		font-size: 1.125rem;
		margin-bottom: 0.5rem;
	}

	.score-info strong {
		color: #fbbf24;
		font-size: 1.5rem;
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
		background: rgba(255, 255, 255, 0.05);
		padding: 1.5rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.vote-group h4 {
		color: hsl(var(--foreground));
		font-size: 1.25rem;
		margin: 0 0 0.5rem 0;
	}

	.vote-hint {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	.player-selection {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.player-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid transparent;
	}

	.player-option:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.player-option input[type='radio'] {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}

	.player-name {
		font-weight: 500;
		font-size: 1rem;
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

	.debug-info {
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid rgba(251, 191, 36, 0.3);
		padding: 0.75rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.role-badge {
		font-size: 0.75rem;
		padding: 0.2rem 0.5rem;
		background: rgba(59, 130, 246, 0.2);
		border-radius: 0.25rem;
		margin-left: 0.5rem;
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
</style>
