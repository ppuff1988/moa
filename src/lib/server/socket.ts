import type { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import { verifyJWT } from './auth';
import { getGameState, updatePlayerOnlineStatus } from './game';
import { db } from './db';
import { gamePlayers, games } from './db/schema';
import { eq, and } from 'drizzle-orm';

let io: SocketIOServer | null = null;

// 房間玩家映射 { roomName: Set<userId> }
const roomUsers = new Map<string, Set<number>>();

// 獲取 Socket.IO 實例
export function getSocketIO(): SocketIOServer | null {
	// 優先返回模組級別的 io（開發環境）
	// 如果不存在，則檢查 global.io（生產環境）
	return io || (globalThis as { io?: SocketIOServer }).io || null;
}

// 初始化 Socket.IO
export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
	if (io) {
		return io;
	}

	io = new SocketIOServer(httpServer, {
		cors: {
			origin: '*',
			methods: ['GET', 'POST']
		},
		path: '/socket.io/',
		// 優先使用 polling 模式，適合開發環境
		transports: ['polling', 'websocket']
	});

	// 將 io 實例同時掛載到 global，確保開發和生產環境都能訪問
	(globalThis as { io?: SocketIOServer }).io = io;

	console.log('[initSocketIO] Socket.IO 實例已初始化並掛載到 global');

	// 身份驗證中間件
	io.use(async (socket, next) => {
		try {
			const token = socket.handshake.auth.token;
			if (!token) {
				return next(new Error('驗證失敗，請重新登入'));
			}

			const payload = await verifyJWT(token);
			if (!payload) {
				return next(new Error('無效的驗證令牌'));
			}

			socket.data.userId = payload.userId;
			next();
		} catch {
			next(new Error('驗證失敗，請重新登入'));
		}
	});

	// 連接處理
	io.on('connection', (socket: Socket) => {
		// 讓用戶加入自己的個人房間（用於單獨通知）
		const userId = socket.data.userId;
		socket.join(`user-${userId}`);

		// 加入房間
		socket.on('join-room', async (roomName: string) => {
			try {
				const userId = socket.data.userId;

				// 查找遊戲
				const [game] = await db.select().from(games).where(eq(games.roomName, roomName)).limit(1);

				if (!game) {
					socket.emit('error', { message: '房間不存在' });
					return;
				}

				// 查找玩家
				const [player] = await db
					.select()
					.from(gamePlayers)
					.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)))
					.limit(1);

				if (!player) {
					socket.emit('error', { message: '您不在此房間中' });
					return;
				}

				// 獲取用戶暱稱和頭像
				const { user } = await import('./db/schema');
				const [userInfo] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

				// 加入 Socket.IO 房間
				socket.join(roomName);
				socket.data.roomName = roomName;
				socket.data.nickname = userInfo?.nickname || `玩家${userId}`;
				socket.data.avatar = userInfo?.avatar || null;

				// 更新玩家在線狀態
				await updatePlayerOnlineStatus(game.id, userId, true);

				// 追蹤房間用戶
				if (!roomUsers.has(roomName)) {
					roomUsers.set(roomName, new Set());
				}
				roomUsers.get(roomName)?.add(userId);

				// 獲取更新的遊戲狀態
				const gameState = await getGameState(game.id);

				// 通知房間內所有玩家
				io?.to(roomName).emit('room-update', {
					game: gameState.game,
					players: gameState.players
				});

				// 通知其他玩家有新玩家加入
				socket.to(roomName).emit('player-joined', {
					userId,
					nickname: socket.data.nickname,
					avatar: socket.data.avatar
				});
			} catch {
				socket.emit('error', { message: '加入房間失敗，請稍後再試' });
			}
		});

		// 離開房間
		socket.on('leave-room', async () => {
			await handleLeaveRoom(socket);
		});

		// 玩家選擇角色
		socket.on('select-role', async (data: { roleId: number; color: string }) => {
			try {
				const userId = socket.data.userId;
				const roomName = socket.data.roomName;
				const nickname = socket.data.nickname || `玩家${userId}`;

				console.log(`[select-role] 用戶 ${userId} (${nickname}) 在房間 ${roomName} 選擇角色`, {
					roleId: data.roleId,
					color: data.color
				});

				if (!roomName) {
					console.error(`[select-role] 用戶 ${userId} 尚未加入房間`);
					socket.emit('error', { message: '尚未加入房間' });
					return;
				}

				// 查找遊戲
				const [game] = await db.select().from(games).where(eq(games.roomName, roomName)).limit(1);

				if (!game) {
					console.error(`[select-role] 房間 ${roomName} 不存在`);
					socket.emit('error', { message: '房間不存在' });
					return;
				}

				console.log(`[select-role] 找到遊戲: ${game.id}, 狀態: ${game.status}`);

				// 更新玩家角色和顏色
				await db
					.update(gamePlayers)
					.set({
						roleId: data.roleId,
						color: data.color,
						isReady: true
					})
					.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)));

				console.log(`[select-role] 已更新用戶 ${userId} 的角色和顏色`);

				// 獲取更新的遊戲狀態
				const gameState = await getGameState(game.id);
				console.log(`[select-role] 獲取遊戲狀態完成，玩家數量: ${gameState.players.length}`);

				// 檢查 Socket.IO 是否可用
				const socketIO = getSocketIO();
				if (!socketIO) {
					console.error('[select-role] Socket.IO 未初始化！');
					socket.emit('error', { message: 'Socket.IO 未初始化' });
					return;
				}

				// 通知房間內所有玩家
				const roomSockets = await socketIO.in(roomName).fetchSockets();
				console.log(
					`[select-role] 準備廣播 room-update 到房間 ${roomName}，房間內有 ${roomSockets.length} 個連接`
				);

				socketIO.to(roomName).emit('room-update', {
					game: gameState.game,
					players: gameState.players
				});

				console.log(`[select-role] ✅ 已成功廣播 room-update 事件`);
			} catch (error) {
				console.error('[select-role] 錯誤:', error);
				socket.emit('error', { message: '選擇角色失敗，請稍後再試' });
			}
		});

		// 玩家準備/取消準備
		socket.on('toggle-ready', async (isReady: boolean) => {
			try {
				const userId = socket.data.userId;
				const roomName = socket.data.roomName;

				if (!roomName) {
					socket.emit('error', { message: '尚未加入房間' });
					return;
				}

				// 查找遊戲
				const [game] = await db.select().from(games).where(eq(games.roomName, roomName)).limit(1);

				if (!game) {
					socket.emit('error', { message: '房間不存在' });
					return;
				}

				// 更新玩家準備狀態
				await db
					.update(gamePlayers)
					.set({ isReady })
					.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)));

				// 獲取更新的遊戲狀態
				const gameState = await getGameState(game.id);

				// 通知房間內所有玩家
				io?.to(roomName).emit('room-update', {
					game: gameState.game,
					players: gameState.players
				});
			} catch {
				socket.emit('error', { message: '更新準備狀態失敗，請稍後再試' });
			}
		});

		// 斷線處理
		socket.on('disconnect', async () => {
			await handleLeaveRoom(socket);
		});
	});

	return io;
}

// 關閉 Socket.IO（用於熱重載或測試）
export function closeSocketIO(): void {
	if (io) {
		io.close();
		io = null;
		roomUsers.clear();
	}
}

// 處理離開房間
async function handleLeaveRoom(socket: Socket) {
	try {
		const userId = socket.data.userId;
		const roomName = socket.data.roomName;
		const nickname = socket.data.nickname || `玩家${userId}`;

		if (!roomName) return;

		// 查找遊戲
		const [game] = await db.select().from(games).where(eq(games.roomName, roomName)).limit(1);

		if (game) {
			// 更新玩家離線狀態
			await updatePlayerOnlineStatus(game.id, userId, false);

			// 從房間用戶列表移除
			roomUsers.get(roomName)?.delete(userId);
			if (roomUsers.get(roomName)?.size === 0) {
				roomUsers.delete(roomName);
			}

			// 獲取更新的遊戲狀態
			const gameState = await getGameState(game.id);

			// 通知房間內其他玩家
			socket.to(roomName).emit('room-update', {
				game: gameState.game,
				players: gameState.players
			});

			socket.to(roomName).emit('player-left', {
				userId,
				nickname
			});
		}

		socket.leave(roomName);
		socket.data.roomName = null;
	} catch {
		// 靜默處理錯誤
	}
}

// 向房間發送事件
export async function emitToRoom(roomName: string, event: string, data: unknown): Promise<void> {
	const socketIO = getSocketIO();
	if (!socketIO) {
		console.error(`[emitToRoom] Socket.IO 未初始化！無法發送事件 ${event} 到房間 ${roomName}`);
		return;
	}

	try {
		// 獲取房間內的所有 socket 連接
		const sockets = await socketIO.in(roomName).fetchSockets();
		console.log(
			`[emitToRoom] 發送事件 ${event} 到房間 ${roomName}，房間內有 ${sockets.length} 個連接`
		);

		if (sockets.length === 0) {
			console.warn(`[emitToRoom] ⚠️  房間 ${roomName} 內沒有任何連接！`);
		} else {
			console.log(
				`[emitToRoom] 房間內的用戶 ID:`,
				sockets.map((s) => s.data.userId || 'unknown')
			);
		}

		socketIO.to(roomName).emit(event, data);
		console.log(`[emitToRoom] ✅ 事件 ${event} 已發送給 ${sockets.length} 個連接`);
	} catch (error) {
		console.error(`[emitToRoom] 發送事件 ${event} 到房間 ${roomName} 時發生錯誤:`, error);
	}
}

// 向特定用戶發送事件
export function emitToUser(userId: number, event: string, data: unknown): void {
	const socketIO = getSocketIO();
	if (!socketIO) {
		return;
	}
	socketIO.to(`user-${userId}`).emit(event, data);
}
