import { writable, derived, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { initSocket, getSocket } from '$lib/utils/socket';
import { addNotification } from '$lib/stores/notifications';
import type { Player, User } from '$lib/types/game';

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

	// Derived store to check if all players are ready
	const checkAllPlayersReady = derived(players, ($players) => {
		if ($players.length === 0) return false;
		return $players.every((p) => p.isReady);
	});

	checkAllPlayersReady.subscribe((value) => {
		allPlayersReady.set(value);
	});

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
						console.log('Socket 已連接，準備加入房間');
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
				try {
					const roomResponse = await fetch(`/api/room/${encodeURIComponent(roomName)}`, {
						credentials: 'include'
					});

					if (!roomResponse.ok) {
						console.error('獲取房間資訊失敗，狀態碼:', roomResponse.status);
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
						return;
					}

					const roomData = await roomResponse.json();

					// 驗證數據結構
					if (roomData && roomData.game) {
						gameStatus.set(roomData.game.status);
						isHost.set(roomData.game.hostId === userData.id);
					} else {
						console.warn('房間數據結構無效:', roomData);
					}

					if (roomData && roomData.players && Array.isArray(roomData.players)) {
						players.set(roomData.players);
					} else {
						console.warn('玩家數據無效或不存在:', roomData?.players);
						players.set([]);
					}
				} catch (error) {
					console.error('獲取房間資訊失敗:', error);
					// 不拋出錯誤，因為 socket 事件會處理
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

	// Set up socket event listeners
	function setupSocketListeners() {
		if (!socket) return;

		// 先移除所有舊的監聽器，避免重複註冊
		socket.off('room-update');
		socket.off('player-joined');
		socket.off('player-left');
		socket.off('player-kicked');
		socket.off('game-started');
		socket.off('selection-started');
		socket.off('player-locked');
		socket.off('player-unlocked');
		socket.off('room-closed');
		socket.off('error');

		// Room update event
		socket.on('room-update', (data: { game: GameData; players: Player[] }) => {
			console.log('[📥 room-update] 收到房間更新廣播', {
				玩家數量: data.players?.length || 0,
				遊戲狀態: data.game?.status,
				遊戲ID: data.game?.id,
				房間名稱: data.game?.roomName
			});

			if (data.players) {
				players.set(data.players);
				console.log(
					'[📥 room-update] 已更新玩家列表',
					data.players.map((p) => ({
						userId: p.userId,
						nickname: p.nickname,
						isReady: p.isReady,
						roleId: p.roleId,
						color: p.color
					}))
				);
			}

			if (data.game) {
				gameStatus.set(data.game.status);
				const user = get(currentUser);
				if (user) {
					isHost.set(data.game.hostId === user.id);
				}
				console.log('[📥 room-update] 已更新遊戲狀態:', data.game.status);
			}
		});

		// Player joined event
		socket.on('player-joined', (data: { userId: number; nickname: string }) => {
			console.log('[📥 player-joined] 玩家加入', {
				userId: data.userId,
				nickname: data.nickname
			});
			addNotification(`${data.nickname} 加入了房間`, 'info');
		});

		// Player left event
		socket.on('player-left', (data: { userId: number; nickname: string }) => {
			console.log('[📥 player-left] 玩家離開', {
				userId: data.userId,
				nickname: data.nickname
			});
			addNotification(`${data.nickname} 離開了房間`, 'info');
		});

		// Player kicked event
		socket.on('player-kicked', (data: { userId: number; nickname?: string }) => {
			console.log('[📥 player-kicked] 玩家被踢出', {
				userId: data.userId,
				nickname: data.nickname
			});

			const user = get(currentUser);
			if (user && data.userId === user.id) {
				console.log('[📥 player-kicked] 本人被踢出房間');
				addNotification('您已被房主踢出房間', 'error');
				void goto('/', { replaceState: true });
			} else {
				addNotification(`${data.nickname || '玩家'} 被踢出房間`, 'info');
			}
		});

		// Game started event
		socket.on('game-started', (data: { gameId?: string; roundId?: number; roomName?: string }) => {
			console.log('[📥 game-started] 遊戲開始', {
				gameId: data.gameId,
				roundId: data.roundId,
				roomName: data.roomName,
				當前房間: roomName
			});

			addNotification('遊戲即將開始！', 'success');
			// Navigate to game page
			const targetPath = `/room/${encodeURIComponent(roomName)}/game`;
			console.log('[📥 game-started] 準備導航到:', targetPath);
			setTimeout(() => {
				console.log('[📥 game-started] 執行導航到:', targetPath);
				void goto(targetPath, { replaceState: false });
			}, 1000);
		});

		// Selection started event
		socket.on('selection-started', async () => {
			console.log('[📥 selection-started] 選角階段開始');
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
					console.log('[📥 selection-started] 已重新獲取並更新房間狀態');
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
				console.log('[📥 player-locked] 玩家鎖定角色', {
					playerId: data.playerId,
					userId: data.userId,
					roleId: data.roleId,
					color: data.color,
					isReady: data.isReady
				});

				players.update((p) => {
					return p.map((player) => {
						if (player.userId === data.userId) {
							console.log('[📥 player-locked] 更新玩家:', player.nickname);
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
			console.log('[📥 player-unlocked] 玩家解鎖角色', {
				playerId: data.playerId,
				userId: data.userId,
				isReady: data.isReady
			});

			players.update((p) => {
				const updatedPlayers = p.map((player) => {
					if (player.userId === data.userId) {
						console.log('[📥 player-unlocked] 更新玩家狀態:', {
							nickname: player.nickname,
							從: { isReady: player.isReady, roleId: player.roleId, color: player.color },
							到: { isReady: data.isReady, roleId: null, color: null }
						});
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

				console.log('[📥 player-unlocked] 玩家列表更新完成');
				return updatedPlayers;
			});
		});

		// Room closed event
		socket.on('room-closed', (data: { message: string; roomName: string }) => {
			console.log('[📥 room-closed] 房間關閉', {
				message: data.message,
				roomName: data.roomName
			});
			addNotification(data.message || '房間已關閉', 'warning');
			void goto('/', { replaceState: true });
		});

		// Error event
		socket.on('error', (data: { message: string }) => {
			console.error('[📥 error] Socket 錯誤:', data.message);
			addNotification(data.message || '發生錯誤', 'error');

			// 如果房間不存在，導向首頁
			if (data.message === '房間不存在') {
				console.log('[📥 error] 房間不存在，導向首頁');
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
				if (socket) {
					socket.emit('leave-room');
				}
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

	// Cleanup
	function cleanup() {
		if (socket) {
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
			socket.off('error');
		}
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
