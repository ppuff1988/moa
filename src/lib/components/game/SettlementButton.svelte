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
		<span>計算中...</span>
	{:else}
		<span>進行遊戲結算</span>
		<span class="settlement-arrow">→</span>
	{/if}
</button>

<style>
	.settlement-btn {
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
	}

	.settlement-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}

	.settlement-btn:hover:not(:disabled)::before {
		transform: translateX(100%);
	}

	.settlement-btn:hover:not(:disabled) {
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(212, 175, 55, 0.5);
	}

	.settlement-btn:active:not(:disabled) {
		transform: translateY(-1px);
	}

	.settlement-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
	}

	.settlement-arrow {
		font-size: 1.25rem;
		transition: transform 0.3s ease;
	}

	.settlement-btn:hover:not(:disabled) .settlement-arrow {
		transform: translateX(6px);
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
