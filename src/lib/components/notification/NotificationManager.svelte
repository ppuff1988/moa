<script lang="ts">
	import { notifications, removeNotification, type Notification } from '$lib/stores/notifications';
	import NotificationToast from './NotificationToast.svelte';

	let currentNotifications: Notification[] = [];
	notifications.subscribe((n: Notification[]) => (currentNotifications = n));
</script>

<div class="notification-container">
	{#each currentNotifications as notification (notification.id)}
		<NotificationToast
			message={notification.message}
			type={notification.type}
			duration={notification.duration}
			onClose={() => removeNotification(notification.id)}
		/>
	{/each}
</div>

<style>
	.notification-container {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		pointer-events: none;
	}

	.notification-container :global(.notification-toast) {
		pointer-events: auto;
	}

	/* 響應式設計 */
	@media (max-width: 768px) {
		.notification-container {
			bottom: 1rem;
			right: 1rem;
			left: 1rem;
		}
	}
</style>
