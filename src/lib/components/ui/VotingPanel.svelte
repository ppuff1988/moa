<script lang="ts">
	import { getJWTToken } from '$lib/utils/jwt';
	import { addNotification } from '$lib/stores/notifications';
	import Portal from '$lib/components/ui/Portal.svelte';

	interface BeastHead {
		id: number;
		animal: string;
		isGenuine: boolean;
		votes: number;
	}

	export let roomName: string;
	export let beastHeads: BeastHead[] = [];
	export let identifiedArtifacts: number[] = [];
	export let isHost: boolean = false;
	export let onVotesSubmitted: () => void = () => {};

	// Suppress unused warning - kept for future use
	$: void identifiedArtifacts;

	let voteInputs: Record<number, number> = {};
	let showConfirmDialog = false;
	let topTwoForConfirmation: number[] = []; // 僅用於確認對話框中顯示排名

	// 12生肖排序（用於同票數時的排序）
	const ZODIAC_ORDER = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];

	// 初始化投票輸入
	$: {
		if (beastHeads.length > 0 && Object.keys(voteInputs).length === 0) {
			voteInputs = {};
			beastHeads.forEach((beast) => {
				voteInputs[beast.id] = 0;
			});
		}
	}

	// 計算前兩名的函數
	function calculateTopTwo(): number[] {
		// 創建投票數組並排序
		const votedBeasts = beastHeads.map((beast) => ({
			id: beast.id,
			animal: beast.animal,
			votes: voteInputs[beast.id] || 0
		}));

		// 排序規則：
		// 1. 票數高的在前
		// 2. 同票數時，按12生肖排序（鼠最小，豬最大）
		votedBeasts.sort((a, b) => {
			if (b.votes !== a.votes) {
				return b.votes - a.votes; // 票數降序
			}
			// 同票數時，按生肖順序
			const orderA = ZODIAC_ORDER.indexOf(a.animal);
			const orderB = ZODIAC_ORDER.indexOf(b.animal);
			return orderA - orderB; // 生肖順序升序（鼠最小）
		});

		// 返回前兩名的ID
		return votedBeasts.slice(0, 2).map((b) => b.id);
	}

	// 獲取排名徽章（僅在確認對話框中使用）
	function getRankBadge(beastId: number): string {
		const index = topTwoForConfirmation.indexOf(beastId);
		if (index === 0) return '🥇'; // 第一名
		if (index === 1) return '🥈'; // 第二名
		return '';
	}

	// 顯示確認對話框
	function showConfirmation() {
		const totalVotes = Object.values(voteInputs).reduce((sum, votes) => sum + votes, 0);
		if (totalVotes === 0) {
			addNotification('請至少為一個獸首分配投票數', 'warning');
			return;
		}

		// 計算排名用於確認對話框顯示
		topTwoForConfirmation = calculateTopTwo();
		showConfirmDialog = true;
	}

	// 取消提交
	function cancelSubmit() {
		showConfirmDialog = false;
		topTwoForConfirmation = [];
	}

	// 確認提交投票
	async function confirmSubmit() {
		showConfirmDialog = false;
		await submitVotes();
		topTwoForConfirmation = [];
	}

	// 提交投票
	async function submitVotes() {
		const token = getJWTToken();
		if (!token) return;

		try {
			const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/submit-votes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ votes: voteInputs })
			});

			if (response.ok) {
				addNotification('投票提交成功', 'success');
				onVotesSubmitted();
			} else {
				const error = await response.json();
				addNotification(error.message || '提交投票失敗', 'error');
			}
		} catch (error) {
			console.error('提交投票錯誤:', error);
			addNotification('提交投票失敗，請檢查網路連接', 'error');
		}
	}

	// 處理投票輸入變更，確保數值>=0
	function handleVoteInput(beastId: number, event: Event) {
		const target = event.target as HTMLInputElement;
		const value = +target.value;
		if (value < 0 || isNaN(value)) {
			voteInputs[beastId] = 0;
		} else {
			voteInputs[beastId] = Math.floor(value); // 確保是整數
		}
	}
</script>

<div class="voting-panel">
	<div class="skills-header">
		<h4 class="action-subtitle">投票階段</h4>
		<p class="skills-description">{isHost ? '請為每個獸首分配投票數' : '房主正在設定投票數'}</p>
	</div>

	{#if isHost}
		<div class="voting-section">
			<div class="voting-grid">
				{#each beastHeads as beast (beast.id)}
					<div class="vote-input-row">
						<label for="vote-{beast.id}" class="vote-label">
							<span class="vote-beast-name">
								{beast.animal}首
							</span>
						</label>
						<input
							id="vote-{beast.id}"
							type="number"
							min="0"
							class="vote-input"
							bind:value={voteInputs[beast.id]}
							placeholder="0"
							on:input={(e) => handleVoteInput(beast.id, e)}
						/>
					</div>
				{/each}
			</div>
			<button class="submit-votes-btn" on:click={showConfirmation}>
				<span>提交投票結果</span>
				<span class="btn-arrow">→</span>
			</button>
		</div>
	{:else}
		<div class="waiting-container">
			<div class="waiting-content">
				<div class="waiting-icon">
					<svg
						class="hourglass-icon"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M5 22h14" />
						<path d="M5 2h14" />
						<path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
						<path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
					</svg>
				</div>
				<h3 class="waiting-title">房主設定中</h3>
				<div class="waiting-dots">
					<span class="dot"></span>
					<span class="dot"></span>
					<span class="dot"></span>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- 確認對話框 -->
<Portal isOpen={showConfirmDialog}>
	<div class="modal-overlay">
		<div class="modal-container">
			<div class="confirm-dialog-content">
				<p class="modal-description">請確認以下投票結果：</p>
				<div class="vote-summary">
					{#each beastHeads
						.filter((b) => (voteInputs[b.id] || 0) > 0)
						.sort((a, b) => {
							const votesA = voteInputs[a.id] || 0;
							const votesB = voteInputs[b.id] || 0;
							if (votesB !== votesA) {
								return votesB - votesA; // 票數降序
							}
							// 同票數時，按生肖順序
							const orderA = ZODIAC_ORDER.indexOf(a.animal);
							const orderB = ZODIAC_ORDER.indexOf(b.animal);
							return orderA - orderB;
						}) as beast (beast.id)}
						<div
							class="vote-summary-item"
							class:is-top-two={topTwoForConfirmation.includes(beast.id)}
						>
							<span class="summary-beast-name">
								{#if getRankBadge(beast.id)}
									<span class="rank-badge-large">{getRankBadge(beast.id)}</span>
								{/if}
								{beast.animal}首
							</span>
							<span class="summary-votes">{voteInputs[beast.id]} 票</span>
						</div>
					{/each}
				</div>
				<p class="modal-warning">⚠️ 提交後將公布排名第二的獸首真偽</p>
				<div class="modal-actions">
					<button class="secondary-btn" on:click={cancelSubmit}>取消</button>
					<button class="confirm-btn" on:click={confirmSubmit}>
						<span>確認提交</span>
						<span class="confirm-arrow">→</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</Portal>

<style>
	.voting-panel {
		display: flex;
		flex-direction: column;
		gap: 0;
		width: 100%;
		max-width: 100%;
		overflow: hidden;
	}

	.skills-header {
		margin-bottom: 0;
		padding: 0 1rem;
	}

	.action-subtitle {
		color: hsl(var(--foreground));
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		margin: 0;
	}

	.skills-description {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		text-align: center;
		margin-top: 0.5rem;
	}

	.voting-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 1.5rem 1rem;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}

	.voting-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		.voting-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.75rem;
		}

		.voting-section {
			padding: 1rem 0.5rem;
		}
	}

	@media (min-width: 481px) and (max-width: 768px) {
		.voting-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
			max-width: 500px;
		}
	}

	@media (min-width: 769px) and (max-width: 1024px) {
		.voting-grid {
			grid-template-columns: repeat(2, 1fr);
			max-width: 600px;
		}
	}

	@media (min-width: 1025px) {
		.voting-grid {
			grid-template-columns: repeat(4, 1fr);
			max-width: 900px;
		}
	}

	.vote-input-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: calc(var(--radius));
		transition: var(--transition-elegant);
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.vote-input-row:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(212, 175, 55, 0.3);
		transform: translateY(-2px);
	}

	.vote-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		text-align: center;
		cursor: pointer;
		width: 100%;
		min-width: 0;
	}

	.vote-beast-name {
		color: hsl(var(--foreground));
		font-weight: 600;
		font-size: 0.9375rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
	}

	@media (max-width: 480px) {
		.vote-beast-name {
			font-size: 0.875rem;
		}

		.vote-input-row {
			padding: 0.75rem 0.5rem;
		}
	}

	.vote-input {
		width: 65px;
		max-width: 100%;
		padding: 0.5rem 0.25rem;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(212, 175, 55, 0.4);
		border-radius: calc(var(--radius) - 2px);
		color: hsl(var(--foreground));
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		transition: var(--transition-elegant);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		.vote-input {
			width: 60px;
			font-size: 0.9375rem;
			padding: 0.4rem 0.25rem;
		}
	}

	.vote-input:focus {
		outline: none;
		border-color: rgba(212, 175, 55, 0.8);
		background: rgba(255, 255, 255, 0.15);
		box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
	}

	.vote-input:hover {
		border-color: rgba(212, 175, 55, 0.6);
		background: rgba(255, 255, 255, 0.12);
	}

	.primary-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: calc(var(--radius));
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
		font-size: 1rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
	}

	.primary-btn:hover:not(:disabled) {
		background: hsl(var(--secondary) / 0.9);
		transform: translateY(-1px);
	}

	.primary-btn:disabled {
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		cursor: not-allowed;
		opacity: 0.5;
	}

	.submit-votes-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.875rem;
		padding: 1rem 2.5rem;
		background: linear-gradient(135deg, #d4af37 0%, #f4e5b1 50%, #d4af37 100%);
		color: #1a1a1a;
		border: none;
		border-radius: 0.875rem;
		font-size: 1.0625rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 16px rgba(212, 175, 55, 0.3);
		position: relative;
		overflow: hidden;
		margin-top: 1rem;
	}

	.submit-votes-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}

	.submit-votes-btn:hover:not(:disabled)::before {
		transform: translateX(100%);
	}

	.submit-votes-btn:hover:not(:disabled) {
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(212, 175, 55, 0.5);
	}

	.submit-votes-btn:active:not(:disabled) {
		transform: translateY(-1px);
	}

	.submit-votes-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
	}

	.btn-arrow {
		font-size: 1.25rem;
		transition: transform 0.3s ease;
	}

	.submit-votes-btn:hover:not(:disabled) .btn-arrow {
		transform: translateX(6px);
	}

	/* 等待容器樣式 */
	.waiting-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0.5rem 2rem 1rem;
		min-height: auto;
	}

	.waiting-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		max-width: 500px;
		text-align: center;
	}

	.waiting-icon {
		width: 88px;
		height: 88px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.3));
		border-radius: 50%;
		border: 3px solid rgba(212, 175, 55, 0.5);
		box-shadow: 0 8px 24px rgba(212, 175, 55, 0.3);
		animation: pulse-glow 2s ease-in-out infinite;
	}

	.hourglass-icon {
		width: 44px;
		height: 44px;
		color: rgba(212, 175, 55, 1);
		animation: rotate-hourglass 3s ease-in-out infinite;
	}

	@keyframes rotate-hourglass {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(180deg);
		}
	}

	@keyframes pulse-glow {
		0%,
		100% {
			box-shadow:
				0 8px 24px rgba(212, 175, 55, 0.3),
				0 0 0 0 rgba(212, 175, 55, 0.4);
		}
		50% {
			box-shadow:
				0 8px 32px rgba(212, 175, 55, 0.5),
				0 0 0 15px rgba(212, 175, 55, 0);
		}
	}

	.waiting-title {
		color: hsl(var(--foreground));
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		line-height: 1.3;
		letter-spacing: 0.02em;
		text-align: center;
	}

	.waiting-dots {
		display: flex;
		gap: 0.625rem;
		align-items: center;
		justify-content: center;
		margin-top: 0.25rem;
	}

	.dot {
		width: 12px;
		height: 12px;
		background: rgba(212, 175, 55, 0.8);
		border-radius: 50%;
		animation: bounce-dots 1.4s ease-in-out infinite;
		box-shadow: 0 2px 4px rgba(212, 175, 55, 0.3);
	}

	.dot:nth-child(1) {
		animation-delay: 0s;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes bounce-dots {
		0%,
		60%,
		100% {
			transform: translateY(0);
			opacity: 0.7;
		}
		30% {
			transform: translateY(-15px);
			opacity: 1;
		}
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		backdrop-filter: blur(6px);
		pointer-events: auto;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-container {
		background: linear-gradient(135deg, #f5f0e8 0%, #ebe4d8 100%);
		border: 3px solid #b8975a;
		border-radius: 20px;
		padding: 2.5rem;
		max-width: 520px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		.modal-container {
			padding: 1.5rem 1rem;
			width: 95%;
			max-height: 85vh;
			border-radius: 16px;
		}
	}

	/* Modal 內容樣式 */
	.confirm-dialog-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		box-sizing: border-box;
	}

	.modal-description {
		color: #5a5045;
		font-size: 1rem;
		margin: 0 0 1.25rem 0;
		text-align: center;
		font-weight: 500;
	}

	@media (max-width: 480px) {
		.modal-description {
			font-size: 0.9375rem;
			margin-bottom: 1rem;
		}
	}

	.vote-summary {
		background: rgba(255, 255, 255, 0.6);
		border: 2px solid rgba(184, 151, 90, 0.3);
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		max-height: 280px;
		overflow-y: auto;
		width: 100%;
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		.vote-summary {
			padding: 0.75rem;
			gap: 0.75rem;
			max-height: 240px;
		}
	}

	.vote-summary-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 10px;
		border: 2px solid rgba(184, 151, 90, 0.2);
		transition: all 0.2s ease;
		gap: 0.5rem;
		min-width: 0;
	}

	@media (max-width: 480px) {
		.vote-summary-item {
			padding: 0.75rem 1rem;
			border-radius: 8px;
		}
	}

	.vote-summary-item:hover {
		background: rgba(255, 255, 255, 0.7);
		border-color: rgba(184, 151, 90, 0.4);
	}

	.vote-summary-item.is-top-two {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(184, 151, 90, 0.2) 100%);
		border: 2px solid rgba(212, 175, 55, 0.6);
		box-shadow: 0 2px 8px rgba(212, 175, 55, 0.2);
	}

	.vote-summary-item.is-top-two:hover {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.35) 0%, rgba(184, 151, 90, 0.3) 100%);
		border-color: rgba(212, 175, 55, 0.8);
	}

	.summary-beast-name {
		color: #3a3226;
		font-weight: 700;
		font-size: 1.125rem;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 480px) {
		.summary-beast-name {
			font-size: 1rem;
			gap: 0.5rem;
		}
	}

	.rank-badge-large {
		font-size: 1.75rem;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
		flex-shrink: 0;
	}

	@media (max-width: 480px) {
		.rank-badge-large {
			font-size: 1.5rem;
		}
	}

	.summary-votes {
		color: #5a5045;
		font-weight: 700;
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	@media (max-width: 480px) {
		.summary-votes {
			font-size: 1.125rem;
		}
	}

	.modal-warning {
		color: #c9892e;
		font-size: 0.9375rem;
		text-align: center;
		margin: 1.25rem 0 0 0;
		font-weight: 600;
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
	}

	@media (max-width: 480px) {
		.modal-warning {
			font-size: 0.875rem;
			margin-top: 1rem;
		}
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 1.5rem;
		width: 100%;
	}

	@media (max-width: 480px) {
		.modal-actions {
			flex-direction: row;
			gap: 0.75rem;
			margin-top: 1.25rem;
		}
	}

	.secondary-btn {
		padding: 0.875rem 1.75rem;
		border: 2px solid #8b7355;
		border-radius: calc(var(--radius));
		background: rgba(255, 255, 255, 0.7);
		color: #5a5045;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 1.0625rem;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
		flex: 1;
		min-width: 0;
	}

	@media (max-width: 480px) {
		.secondary-btn {
			padding: 0.75rem 1rem;
			font-size: 1rem;
		}
	}

	.secondary-btn:hover {
		background: rgba(255, 255, 255, 0.9);
		border-color: #6d5a44;
		transform: translateY(-1px);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
	}

	.confirm-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.875rem;
		padding: 0.875rem 1.75rem;
		background: linear-gradient(135deg, #d4af37 0%, #f4e5b1 50%, #d4af37 100%);
		color: #1a1a1a;
		border: none;
		border-radius: calc(var(--radius));
		font-size: 1.0625rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
		position: relative;
		overflow: hidden;
		flex: 1;
		min-width: 0;
	}

	.confirm-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}

	.confirm-btn:hover::before {
		transform: translateX(100%);
	}

	.confirm-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(212, 175, 55, 0.5);
	}

	.confirm-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.confirm-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: #c4b5a0;
		color: #8b8073;
		box-shadow: none;
	}

	.confirm-arrow {
		font-size: 1.25rem;
		transition: transform 0.3s ease;
	}

	.confirm-btn:hover:not(:disabled) .confirm-arrow {
		transform: translateX(6px);
	}

	@media (max-width: 480px) {
		.confirm-btn {
			padding: 0.75rem 1rem;
			font-size: 1rem;
		}
	}
</style>
