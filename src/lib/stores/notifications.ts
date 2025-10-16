import { writable } from 'svelte/store';

export interface Notification {
	id: string;
	message: string;
	type: 'success' | 'info' | 'warning' | 'error';
	duration?: number;
}

export const notifications = writable<Notification[]>([]);

export function addNotification(
	message: string,
	type: 'success' | 'info' | 'warning' | 'error' = 'info',
	duration: number = 3000
) {
	const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
	const notification: Notification = { id, message, type, duration };

	notifications.update((n) => [...n, notification]);

	return id;
}

export function removeNotification(id: string) {
	notifications.update((n) => n.filter((notification) => notification.id !== id));
}
