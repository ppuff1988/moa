<script lang="ts">
	import {
		notifications,
		removeNotification,
		currentGameStatus,
		type Notification
	} from '$lib/stores/notifications';
	import NotificationToast from './NotificationToast.svelte';

	let currentNotifications: Notification[] = [];
	let gameStatus: string = 'waiting';

	notifications.subscribe((n: Notification[]) => (currentNotifications = n));
	currentGameStatus.subscribe((status: string) => (gameStatus = status));

	// 判斷是否應該顯示在底部（waiting 或 selecting 狀態）
	$: showAtBottom = gameStatus === 'waiting' || gameStatus === 'selecting';
</script>

<div class="notification-container" class:bottom={showAtBottom} class:top={!showAtBottom}>
	{#each currentNotifications as notification (notification.id)}
		<NotificationToast
			message={notification.message}
			type={notification.type}
			duration={notification.duration}
			onClose={() => removeNotification(notification.id)}
			position={showAtBottom ? 'bottom' : 'top'}
		/>
	{/each}
</div>

<style>
	.notification-container {
		position: fixed;
		right: 2rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		pointer-events: none;
	}

	.notification-container.bottom {
		bottom: 2rem;
	}

	.notification-container.top {
		top: 2rem;
	}

	.notification-container :global(.notification-toast) {
		pointer-events: auto;
	}

	/* 響應式設計 */
	@media (max-width: 768px) {
		.notification-container {
			right: 1rem;
			left: 1rem;
		}

		.notification-container.bottom {
			bottom: 1rem;
		}

		.notification-container.top {
			top: 1rem;
		}
	}
</style>
