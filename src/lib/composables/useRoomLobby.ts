import { goto } from '$app/navigation';
import { addNotification } from '$lib/stores/notifications';
import type { Player, User } from '$lib/types/game';
import { getSocket, initSocket } from '$lib/utils/socket';
import { derived, get, writable } from 'svelte/store';

interface GameData {
	id: number;
	status: string;
	hostId: number;
	roomName: string;
	playerCount: number;
}

export function useRoomLobby(roomName: string) {
	// Create stores
	const currentUser = writable<User | null>(null);
	const players = writable<Player[]>([]);
	const isLoading = writable<boolean>(true);
	const isHost = writable<boolean>(false);
	const gameStatus = writable<string>('waiting');
	const allPlayersReady = writable<boolean>(false);

	let socket: ReturnType<typeof getSocket> = null;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;

	// Derived store to check if all players are ready
	const checkAllPlayersReady = derived(players, ($players) => {
		if ($players.length === 0) return false;
		return $players.every((p) => p.isReady);
	});

	checkAllPlayersReady.subscribe((value) => {
		allPlayersReady.set(value);
	});

	// 獲取房間狀態（用於 polling）
	async function fetchRoomState() {
		try {
			const roomResponse = await fetch(`/api/room/${encodeURIComponent(roomName)}`, {
				credentials: 'include'
			});

			if (!roomResponse.ok) {
				if (roomResponse.status === 401) {
					addNotification('認證失敗，請重新登入', 'error');
					await goto('/auth/login', { replaceState: true, invalidateAll: true });
				} else if (roomResponse.status === 403) {
					addNotification('您不在此房間中', 'error');
					await goto('/', { replaceState: true, invalidateAll: true });
				} else if (roomResponse.status === 404) {
					addNotification('房間不存在', 'error');
					await goto('/', { replaceState: true, invalidateAll: true });
				}
				return false;
			}

			const roomData = await roomResponse.json();

			// 驗證數據結構
			if (roomData && roomData.game) {
				gameStatus.set(roomData.game.status);
				const user = get(currentUser);
				if (user) {
					isHost.set(roomData.game.hostId === user.id);
				}
			}

			if (roomData && roomData.players && Array.isArray(roomData.players)) {
				players.set(roomData.players);
			}

			return true;
		} catch (error) {
			console.error('獲取房間資訊失敗:', error);
			return false;
		}
	}

	// 啟動 polling（作為 socket 的備份機制）
	function startPolling() {
		// 清除舊的 polling
		if (pollingInterval) {
			clearInterval(pollingInterval);
		}

		// 每 5 秒更新一次房間狀態（作為 socket 的備份）
		pollingInterval = setInterval(async () => {
			await fetchRoomState();
		}, 5000);

		console.log('[useRoomLobby] 已啟動 polling 機制（每 5 秒）');
	}

	// 停止 polling
	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
			console.log('[useRoomLobby] 已停止 polling 機制');
		}
	}

	// Initialize room
	async function initialize() {
		try {
			isLoading.set(true);

			// Fetch current user info with credentials
			const userResponse = await fetch('/api/user/profile', {
				credentials: 'include'
			});
			if (!userResponse.ok) {
				throw new Error('無法獲取用戶信息');
			}
			const userData = await userResponse.json();
			currentUser.set(userData);

			// Initialize socket connection first
			socket = initSocket();

			// Set up socket event listeners
			setupSocketListeners();

			// Wait for socket to be connected before joining room
			await new Promise<void>((resolve) => {
				if (socket?.connected) {
					// Already connected
					resolve();
				} else {
					// Wait for connection
					socket?.once('connect', () => {
						resolve();
					});

					// Fallback: if already connecting but not yet marked as connected
					setTimeout(() => resolve(), 1000);
				}
			});

			// Join the room via socket (this will trigger server-side join)
			socket.emit('join-room', roomName);

			// Wait a bit for socket join to complete, then fetch room state
			// The socket event will populate most data, but we fetch to ensure consistency
			setTimeout(async () => {
				const success = await fetchRoomState();
				if (success) {
					// 啟動 polling 機制作為 socket 的備份
					startPolling();
				}
			}, 500);
		} catch (error) {
			console.error('初始化房間失敗:', error);
			addNotification('載入房間失敗，請重試', 'error');
			await goto('/', { replaceState: true });
		} finally {
			isLoading.set(false);
		}
	}

	// 追蹤是否已設置監聽器（避免重複註冊）
	let listenersSetup = false;

	// Set up socket event listeners
	function setupSocketListeners() {
		if (!socket) return;

		// 如果已經設置過，先完全清理
		if (listenersSetup) {
			console.log('[useRoomLobby] 檢測到重複設置監聽器，先清理舊的');
			cleanupSocketListeners();
		}

		listenersSetup = true;
		console.log('[useRoomLobby] 設置 socket 監聽器');

		// Room update event
		socket.on('room-update', (data: { game: GameData; players: Player[] }) => {
			if (data.players) {
				players.set(data.players);
			}

			if (data.game) {
				gameStatus.set(data.game.status);
				const user = get(currentUser);
				if (user) {
					isHost.set(data.game.hostId === user.id);
				}
			}
		});

		// Player joined event
		socket.on(
			'player-joined',
			(data: { userId: number; nickname: string; avatar?: string | null }) => {
				console.log('[useRoomLobby] 📥 收到 player-joined 事件:', data.nickname);
				addNotification(`${data.nickname} 加入了房間`, 'info');
			}
		);

		// Player left event
		socket.on('player-left', (data: { userId: number; nickname: string }) => {
			console.log('[useRoomLobby] 📥 收到 player-left 事件:', data.nickname);
			// 在 selecting 狀態下不顯示通知（避免干擾選角）
			const status = get(gameStatus);
			if (status !== 'selecting') {
				addNotification(`${data.nickname} 離開了房間`, 'info');
			}
		});

		// Player kicked event
		socket.on('player-kicked', (data: { userId: number; nickname?: string }) => {
			const user = get(currentUser);
			if (user && data.userId === user.id) {
				addNotification('您已被房主踢出房間', 'error');
				void goto('/', { replaceState: true });
			} else {
				addNotification(`${data.nickname || '玩家'} 被踢出房間`, 'info');
			}
		});

		// Game started event
		socket.on('game-started', () => {
			addNotification('遊戲即將開始！', 'success');
			// Navigate to game page
			const targetPath = `/room/${encodeURIComponent(roomName)}/game`;
			setTimeout(() => {
				void goto(targetPath, { replaceState: false });
			}, 1000);
		});

		// Selection started event
		socket.on('selection-started', async () => {
			gameStatus.set('selecting');
			addNotification('選角階段已開始', 'success');

			// 強制重新獲取房間狀態，確保所有玩家的 UI 都更新
			try {
				const roomResponse = await fetch(`/api/room/${encodeURIComponent(roomName)}`, {
					credentials: 'include'
				});

				if (roomResponse.ok) {
					const roomData = await roomResponse.json();
					if (roomData && roomData.game) {
						gameStatus.set(roomData.game.status);
					}
					if (roomData && roomData.players && Array.isArray(roomData.players)) {
						players.set(roomData.players);
					}
				}
			} catch (error) {
				console.error('[📥 selection-started] 重新獲取房間狀態失敗:', error);
			}
		});

		// Player locked role
		socket.on(
			'player-locked',
			(data: {
				playerId: string;
				userId: number;
				roleId: number;
				color: string;
				colorCode: string;
				isReady: boolean;
			}) => {
				players.update((p) => {
					return p.map((player) => {
						if (player.userId === data.userId) {
							return {
								...player,
								roleId: data.roleId,
								isReady: data.isReady,
								color: data.color,
								colorCode: data.colorCode
							};
						}
						return player;
					});
				});
			}
		);

		// Player unlocked role
		socket.on('player-unlocked', (data: { playerId: string; userId: number; isReady: boolean }) => {
			players.update((p) => {
				return p.map((player) => {
					if (player.userId === data.userId) {
						return {
							...player,
							roleId: null,
							isReady: data.isReady,
							color: null,
							colorCode: undefined
						};
					}
					return player;
				});
			});
		});

		// Game force ended event (人數不足強制結束)
		socket.on(
			'game-force-ended',
			(data: {
				reason: string;
				playerLeft?: { userId: number; nickname: string };
				kickedPlayer?: { userId: number; nickname: string };
			}) => {
				const message = data.reason || '由於人數不足，遊戲已強制結束';

				console.log('[📥 game-force-ended] 收到強制結束事件:', message);

				// 立即導向首頁
				void goto('/', { replaceState: true, invalidateAll: true });

				// 延遲顯示 alert，避免阻塞導航
				setTimeout(() => {
					alert(message);
				}, 100);
			}
		);

		// Room closed event
		socket.on('room-closed', (data: { message: string; roomName: string }) => {
			addNotification(data.message || '房間已關閉', 'warning');
			void goto('/', { replaceState: true });
		});

		// Error event
		socket.on('error', (data: { message: string }) => {
			console.error('[📥 error] Socket 錯誤:', data.message);
			addNotification(data.message || '發生錯誤', 'error');

			// 如果房間不存在，導向首頁
			if (data.message === '房間不存在') {
				void goto('/', { replaceState: true });
			}
		});
	}

	// Leave room
	async function leaveRoom() {
		try {
			const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/leave`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			});

			if (response.ok) {
				addNotification('已離開房間', 'success');
				// 不需要手動 emit leave-room，讓 disconnect 自然觸發清理
				// 這樣可以避免重複廣播 player-left 通知
				await goto('/', { replaceState: true });
			} else {
				const errorData = await response.json();
				console.error('[前端] 離開房間失敗:', errorData);
				addNotification(errorData.message || '離開房間失敗', 'error');
			}
		} catch (error) {
			console.error('[前端] 離開房間發生錯誤:', error);
			addNotification('離開房間失敗', 'error');
		}
	}

	// Start selection phase
	async function startSelection() {
		try {
			const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/start-selection`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			});

			if (!response.ok) {
				const data = await response.json();
				addNotification(data.message || '開始選角失敗', 'error');
			}
			// Success will be handled by socket event
		} catch (error) {
			console.error('開始選角失敗:', error);
			addNotification('開始選角失敗', 'error');
		}
	}

	// Start game
	async function startGame() {
		try {
			const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/start`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			});

			if (!response.ok) {
				const data = await response.json();
				addNotification(data.message || '開始遊戲失敗', 'error');
			}
			// Success will be handled by socket event
		} catch (error) {
			console.error('開始遊戲失敗:', error);
			addNotification('開始遊戲失敗', 'error');
		}
	}

	// Kick player
	async function kickPlayer(targetUserId: number) {
		try {
			const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/kick`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ targetUserId }),
				credentials: 'include'
			});

			if (response.ok) {
				addNotification('已踢出玩家', 'success');
			} else {
				const data = await response.json();
				addNotification(data.message || '踢出玩家失敗', 'error');
			}
		} catch (error) {
			console.error('踢出玩家失敗:', error);
			addNotification('踢出玩家失敗', 'error');
		}
	}

	// 清理 socket 監聽器
	function cleanupSocketListeners() {
		if (socket) {
			console.log('[useRoomLobby] 清理 socket 監聽器');
			// Remove all event listeners
			socket.off('room-update');
			socket.off('player-joined');
			socket.off('player-left');
			socket.off('player-kicked');
			socket.off('game-started');
			socket.off('selection-started');
			socket.off('player-locked');
			socket.off('player-unlocked');
			socket.off('room-closed');
			socket.off('game-force-ended');
			socket.off('error');
			listenersSetup = false;
		}
	}

	// Cleanup
	function cleanup() {
		// 停止 polling
		stopPolling();
		// 清理監聽器
		cleanupSocketListeners();
	}

	return {
		// Stores
		currentUser,
		players,
		isLoading,
		isHost,
		gameStatus,
		allPlayersReady,

		// Methods
		initialize,
		cleanup,
		leaveRoom,
		startSelection,
		startGame,
		kickPlayer
	};
}
