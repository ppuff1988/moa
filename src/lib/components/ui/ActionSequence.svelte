<script lang="ts">
	import { getJWTToken } from '$lib/utils/jwt';

	export let roomName: string;
	export let isOpen: boolean = false;

	interface Action {
		id: number;
		ordering: number;
		type: string;
		data: Record<string, unknown>;
		timestamp: Date;
	}

	interface RoundData {
		roundNumber: number;
		phase: string;
		startedAt: Date;
		completedAt: Date | null;
		myOrderIndex: number | null;
		totalPlayers: number;
		actions: Action[];
		isCompleted: boolean;
		isAttacked: boolean; // 新增：是否在此回合被攻擊
	}

	interface PlayerInfo {
		id: number;
		nickname: string;
		role: { name: string; camp: string } | null;
	}

	interface ActionHistory {
		playerInfo: PlayerInfo;
		rounds: RoundData[];
		currentRound: number | null;
	}

	let actionHistory: ActionHistory | null = null;
	let isLoading = false; // 改為 false，避免阻擋初次調用
	let error: string | null = null;

	async function fetchActionHistory() {
		const token = getJWTToken();
		if (!token) {
			error = '請先登入';
			isLoading = false;
			return;
		}

		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/action-history`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					actionHistory = data;
				} else {
					error = data.error || '獲取資料失敗';
				}
			} else {
				error = '無法獲取行動歷史';
			}
		} catch (err) {
			console.error('獲取行動歷史錯誤:', err);
			error = '網路錯誤';
		} finally {
			isLoading = false;
		}
	}

	function getActionTypeText(type: string): string {
		const typeMap: Record<string, string> = {
			identify_artifact: '鑑定寶物',
			identify_player: '鑑定玩家',
			attack_player: '攻擊玩家',
			block_artifact: '封鎖寶物',
			swap_artifacts: '交換真偽',
			fool_player: '迷惑玩家',
			blocked_by_attack: '被攻擊無法行動',
			skip: '跳過',
			unknown: '未知行動'
		};
		return typeMap[type] || type;
	}

	function getPhaseText(phase: string): string {
		const phaseMap: Record<string, string> = {
			action: '行動階段',
			discussion: '討論階段',
			voting: '投票階段',
			result: '投票結果',
			identification: '鑑人階段',
			completed: '遊戲結束'
		};
		return phaseMap[phase] || phase;
	}

	// 新增：格式化行動詳情
	function getActionDetails(action: Action): string[] {
		const details: string[] = [];

		// 根據不同的行動類型顯示不同的詳情
		switch (action.type) {
			case 'identify_artifact':
				if (action.data.artifactName) {
					details.push(`寶物：${action.data.artifactName}`);
				}
				if (action.data.blocked) {
					details.push('❌ 無法鑑定');
				} else if (action.data.result !== undefined) {
					details.push(`結果：${action.data.result ? '真品 ✓' : '贗品 ✗'}`);
				}
				break;

			case 'identify_player':
				if (action.data.targetPlayerNickname) {
					details.push(`目標玩家：${action.data.targetPlayerNickname}`);
				}
				if (action.data.blocked) {
					details.push('❌ 被攻擊無法鑑定');
				} else if (action.data.camp) {
					const campText =
						action.data.camp === 'good'
							? '許愿陣營 👼'
							: action.data.camp === 'bad'
								? '老朝奉陣營 😈'
								: String(action.data.camp);
					details.push(`鑑定結果：${campText}`);
				}
				break;

			case 'attack_player':
				if (action.data.targetPlayerNickname) {
					details.push(`目標玩家：${action.data.targetPlayerNickname}`);
				}
				if (action.data.attackedRound) {
					details.push(`將在第 ${action.data.attackedRound} 回合受影響`);
				} else if (action.data.blockedRound) {
					// 向後兼容舊的 blockedRound 欄位
					details.push(`該玩家將在第 ${action.data.blockedRound} 回合無法行動`);
				}
				break;

			case 'block_artifact':
				if (action.data.artifactName) {
					details.push(`寶物：${action.data.artifactName}`);
				}
				if (action.data.blocked) {
					details.push('❌ 被攻擊無法封鎖');
				} else {
					details.push('該寶物已被封鎖');
				}
				break;

			case 'swap_artifacts':
				if (action.data.blocked) {
					details.push('❌ 被攻擊無法交換真偽');
				} else if (action.data.artifactNames && Array.isArray(action.data.artifactNames)) {
					details.push(`交換了 ${(action.data.artifactNames as unknown[]).length} 個寶物的真偽`);
				} else {
					details.push('交換了本回合寶物的真偽');
				}
				break;

			case 'fool_player':
				if (action.data.targetPlayerNickname) {
					details.push(`目標玩家：${action.data.targetPlayerNickname}`);
				}
				details.push('該玩家被迷惑');
				break;

			case 'blocked_by_attack':
				if (action.data.reason) {
					details.push(String(action.data.reason));
				}
				break;
		}

		return details;
	}

	// 使用響應式語句監聽 isOpen 變化
	$: if (isOpen) {
		// 每次打開時都重新獲取最新數據
		fetchActionHistory();
	}

	function closeModal() {
		isOpen = false;
	}
</script>

{#if isOpen}
	<div
		class="modal-overlay"
		on:click={closeModal}
		on:keydown={(e) => e.key === 'Escape' && closeModal()}
		role="presentation"
		tabindex="-1"
	>
		<div
			class="modal-content"
			on:click|stopPropagation
			on:keydown={() => {}}
			role="dialog"
			aria-modal="true"
			tabindex="0"
		>
			<div class="modal-header">
				<h2>我的行動順序</h2>
				<button class="close-btn" on:click={closeModal} aria-label="關閉">✕</button>
			</div>

			<div class="modal-body">
				{#if isLoading}
					<div class="loading">載入中...</div>
				{:else if error}
					<div class="error">{error}</div>
				{:else if actionHistory}
					<div class="player-info">
						<div class="info-row">
							<span class="label">玩家顏色：</span>
							<span class="value">{actionHistory.playerInfo.nickname}</span>
						</div>
						{#if actionHistory.playerInfo.role}
							<div class="info-row">
								<span class="label">角色：</span>
								<span class="value">{actionHistory.playerInfo.role.name}</span>
								<span
									class="camp-badge"
									class:camp-good={actionHistory.playerInfo.role.camp === 'good'}
									class:camp-bad={actionHistory.playerInfo.role.camp !== 'good'}
								>
									{actionHistory.playerInfo.role.camp === 'good' ? '許愿陣營 👼' : '老朝奉陣營 😈'}
								</span>
							</div>
						{/if}
						{#if actionHistory.currentRound}
							<div class="info-row">
								<span class="label">當前回合：</span>
								<span class="value highlight">第 {actionHistory.currentRound} 回合</span>
							</div>
						{/if}
					</div>

					<div class="rounds-container">
						{#each actionHistory.rounds as round (round.roundNumber)}
							<div
								class="round-card"
								class:round-current={round.roundNumber === actionHistory.currentRound}
								class:round-completed={round.isCompleted}
							>
								<div class="round-header">
									<h3>第 {round.roundNumber} 回合</h3>
									<span class="phase-badge">{getPhaseText(round.phase)}</span>
									{#if round.roundNumber === actionHistory.currentRound}
										<span class="current-badge">進行中</span>
									{/if}
								</div>

								{#if round.myOrderIndex !== null}
									<div class="order-info">
										<span
											>我的行動順序：第 {round.myOrderIndex} 位（共 {round.totalPlayers} 位玩家）</span
										>
									</div>
								{/if}

								<!-- 新增：顯示被攻擊狀態（只有在輪到玩家後才顯示） -->
								{#if round.isAttacked && round.actions.length > 0}
									<div class="attacked-warning">
										<span class="warning-icon">⚠️</span>
										<span>本回合你被攻擊了，無法執行任何行動！</span>
									</div>
								{/if}

								{#if round.actions.length > 0}
									<div class="actions-list">
										<h4>已執行的行動：</h4>
										{#each round.actions as action (action.id)}
											<div class="action-item">
												<div class="action-header">
													<span class="action-type">{getActionTypeText(action.type)}</span>
													<!--													<span class="action-time">{formatTimestamp(action.timestamp)}</span>-->
												</div>
												<!-- 新增：顯示更詳細的行動資訊 -->
												{#if getActionDetails(action).length > 0}
													<div class="action-full-details">
														{#each getActionDetails(action) as detail, index (index)}
															<div class="detail-item">{detail}</div>
														{/each}
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{:else if round.isAttacked && round.myOrderIndex !== null}
									<!-- 如果被攻擊且沒有行動，顯示特別提示 -->
									<div class="no-actions">因被攻擊而無法行動</div>
								{:else}
									<div class="no-actions">尚未執行任何行動</div>
								{/if}

								<!--								<div class="round-footer">-->
								<!--									<span class="timestamp">開始時間: {formatTimestamp(round.startedAt)}</span>-->
								<!--									{#if round.completedAt}-->
								<!--										<span class="timestamp">結束時間: {formatTimestamp(round.completedAt)}</span>-->
								<!--									{/if}-->
								<!--								</div>-->
							</div>
						{/each}

						{#if actionHistory.rounds.length === 0}
							<div class="no-rounds">遊戲尚未開始任何回合</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
		border-radius: 16px;
		max-width: 800px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		color: #f8fafc;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.close-btn {
		background: none;
		border: none;
		color: #94a3b8;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: #f8fafc;
	}

	.modal-body {
		padding: 1.5rem 2rem;
		overflow-y: auto;
		flex: 1;
	}

	.loading,
	.error,
	.no-rounds,
	.no-actions {
		text-align: center;
		padding: 2rem;
		color: #94a3b8;
	}

	.error {
		color: #ef4444;
	}

	.player-info {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.info-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.info-row:last-child {
		margin-bottom: 0;
	}

	.label {
		color: #94a3b8;
		font-size: 0.9rem;
	}

	.value {
		color: #f8fafc;
		font-weight: 500;
	}

	.value.highlight {
		color: #60a5fa;
		font-weight: 600;
	}

	.camp-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.camp-badge.camp-good {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.camp-badge.camp-bad {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.rounds-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.round-card {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.3s;
	}

	.round-card.round-current {
		border-color: #60a5fa;
		box-shadow: 0 0 20px rgba(96, 165, 250, 0.3);
	}

	.round-card.round-completed {
		opacity: 0.7;
	}

	.round-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.round-header h3 {
		margin: 0;
		color: #f8fafc;
		font-size: 1.25rem;
	}

	.phase-badge {
		padding: 0.25rem 0.75rem;
		background: rgba(168, 85, 247, 0.2);
		color: #a855f7;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.current-badge {
		padding: 0.25rem 0.75rem;
		background: rgba(96, 165, 250, 0.2);
		color: #60a5fa;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}

	.order-info {
		background: rgba(59, 130, 246, 0.1);
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border-left: 3px solid #3b82f6;
	}

	.order-info span {
		color: #93c5fd;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.actions-list h4 {
		color: #cbd5e1;
		font-size: 0.95rem;
		margin: 0 0 0.75rem 0;
		font-weight: 500;
	}

	.action-item {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		border-left: 3px solid #22c55e;
	}

	.action-item:last-child {
		margin-bottom: 0;
	}

	.action-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.action-type {
		color: #f8fafc;
		font-weight: 600;
		font-size: 0.9rem;
	}

	/* 滾動條樣式 */
	.modal-body::-webkit-scrollbar {
		width: 8px;
	}

	.modal-body::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}

	.modal-body::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	.modal-body::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.action-full-details {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		color: #cbd5e1;
		font-size: 0.85rem;
	}

	.detail-item {
		margin-left: 1rem;
		position: relative;
		padding-left: 1.25rem;
	}

	.detail-item::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.6rem;
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: #60a5fa;
	}

	.attacked-warning {
		background: rgba(239, 68, 68, 0.1);
		border-left: 3px solid #ef4444;
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.warning-icon {
		font-size: 1.25rem;
		color: #ef4444;
	}

	.attacked-warning span {
		font-size: 0.9rem;
		font-weight: 500;
	}
</style>
