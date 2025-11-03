import { writable } from 'svelte/store';
import { getJWTToken } from '$lib/utils/jwt';

export function useLeaveRoom() {
	const showLeaveConfirmModal = writable(false);
	const isLeavingRoom = writable(false);

	function openLeaveConfirmModal() {
		showLeaveConfirmModal.set(true);
	}

	function closeLeaveConfirmModal() {
		showLeaveConfirmModal.set(false);
	}

	function handleLeaveRoom() {
		openLeaveConfirmModal();
	}

	async function handleConfirmLeave(roomName: string, onSuccess?: () => void) {
		const success = await confirmLeaveRoom(roomName);
		if (success && onSuccess) {
			onSuccess();
		}
	}

	async function confirmLeaveRoom(roomName: string) {
		showLeaveConfirmModal.set(false);
		isLeavingRoom.set(true);

		try {
			const token = getJWTToken();
			if (!token) {
				alert('請先登入');
				isLeavingRoom.set(false);
				return false;
			}

			const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/leave`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				window.location.href = '/';
				return true;
			} else {
				const data = await response.json();
				alert(data.message || '離開房間失敗');
				return false;
			}
		} catch (error) {
			console.error('離開房間錯誤:', error);
			alert('離開房間時發生錯誤');
			return false;
		} finally {
			isLeavingRoom.set(false);
		}
	}

	return {
		showLeaveConfirmModal,
		isLeavingRoom,
		handleLeaveRoom,
		handleConfirmLeave,
		closeLeaveConfirmModal,
		confirmLeaveRoom
	};
}
