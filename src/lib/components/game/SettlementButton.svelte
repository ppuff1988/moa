<script lang="ts">
	import { getJWTToken } from '$lib/utils/jwt';
	import { addNotification } from '$lib/stores/notifications';

	export let roomName: string;
	export let currentRound: number = 3;
	export let isHost: boolean = false;

	let isCalculating = false;

	const calculateSettlement = async () => {
		if (!isHost || currentRound !== 3) return;

		isCalculating = true;
		const token = getJWTToken();
		if (!token) {
			isCalculating = false;
			return;
		}

		try {
			const response = await fetch(
				`/api/room/${encodeURIComponent(roomName)}/calculate-settlement`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (response.ok) {
				const data = await response.json();

				// 只在遊戲結束時顯示通知，進入鑑人階段的通知由 Socket.IO 事件統一處理
				if (data.needIdentification) {
					// Socket.IO 會廣播 enter-identification-phase 事件，不需要重複通知
				} else {
					addNotification(`${data.winner}獲勝！`, 'success', 5000);
				}
			} else {
				const error = await response.json();
				addNotification(error.message || '結算失敗', 'error');
			}
		} catch (error) {
			console.error('結算錯誤:', error);
			addNotification('結算失敗，請檢查網路連接', 'error');
		} finally {
			isCalculating = false;
		}
	};
</script>

<button
	class="settlement-btn"
	on:click={calculateSettlement}
	disabled={isCalculating || !isHost || currentRound !== 3}
>
	{#if isCalculating}
		<span class="spinner"></span>
		計算中...
	{:else}
		🎯 進行遊戲結算
	{/if}
</button>

<style>
	.settlement-btn {
		padding: 1rem 2rem;
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-size: 1.125rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: center;
		width: 100%;
		max-width: 300px;
		margin: 0 auto;
	}

	.settlement-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(245, 158, 11, 0.5);
	}

	.settlement-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
