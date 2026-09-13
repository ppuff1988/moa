import { and, eq, inArray } from 'drizzle-orm';
import type { Server as HTTPServer } from 'http';
import type { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';
import { getUserFromJWT } from './auth';
import { db } from './db';
import { gamePlayers, games } from './db/schema';
import { getGameState, updatePlayerOnlineStatus } from './game';

let io: SocketIOServer | null = null;

// 同一玩家可能同時開啟多個遊戲分頁；只有最後一條連線離開才算離線。
const roomConnections = new Map<string, Map<number, Set<string>>>();

function addRoomConnection(roomName: string, userId: number, socketId: string): void {
	let userConnections = roomConnections.get(roomName);
	if (!userConnections) {
		userConnections = new Map();
		roomConnections.set(roomName, userConnections);
	}

	let socketIds = userConnections.get(userId);
	if (!socketIds) {
		socketIds = new Set<string>();
		userConnections.set(userId, socketIds);
	}
	socketIds.add(socketId);
}

function removeRoomConnection(roomName: string, userId: number, socketId: string): number {
	const userConnections = roomConnections.get(roomName);
	const socketIds = userConnections?.get(userId);
	socketIds?.delete(socketId);
	const remainingConnections = socketIds?.size ?? 0;

	if (remainingConnections === 0) userConnections?.delete(userId);
	if (userConnections?.size === 0) roomConnections.delete(roomName);
	return remainingConnections;
}

function hasRoomConnection(roomName: string, userId: number): boolean {
	return (roomConnections.get(roomName)?.get(userId)?.size ?? 0) > 0;
}

async function resetActivePlayerPresence(): Promise<void> {
	await db
		.update(gamePlayers)
		.set({ isOnline: false })
		.where(
			inArray(
				gamePlayers.gameId,
				db.select({ id: games.id }).from(games).where(eq(games.status, 'playing'))
			)
		);
}

// 獲取 Socket.IO 實例
export function getSocketIO(): SocketIOServer | null {
	// 優先返回模組級別的 io（開發環境）
	// 如果不存在，則檢查 global.io（生產環境）
	return io || (globalThis as { io?: SocketIOServer }).io || null;
}

/**
 * 檢查指定玩家是否仍有 Socket 連線在房間內。
 * API 路由在更新 presence 前使用同一個查詢，避免多分頁時誤標記離線。
 */
export async function hasPlayerSocket(roomName: string, userId: number): Promise<boolean> {
	const socketIO = getSocketIO();
	if (!socketIO) return false;

	try {
		const sockets = await socketIO.in(roomName).fetchSockets();
		return sockets.some((socket) => socket.data.userId === userId);
	} catch (error) {
		console.error('[hasPlayerSocket] 查詢房間連線失敗:', error);
		return false;
	}
}

// 初始化 Socket.IO
export async function initSocketIO(httpServer: HTTPServer): Promise<SocketIOServer> {
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
	await resetActivePlayerPresence();

	// 身份驗證中間件：支援 JWT auth token 及 cookie 鏈式驗證
	io.use(async (socket, next) => {
		try {
			// 1. 優先使用 handshake auth 中的 JWT token
			const token = socket.handshake.auth.token;
			if (token) {
				const authenticatedUser = await getUserFromJWT(token);
				if (authenticatedUser) {
					socket.data.userId = authenticatedUser.id;
					return next();
				}
			}

			// 2. Fallback：從 handshake cookie 中讀取 jwt cookie
			const cookieHeader = socket.handshake.headers.cookie || '';
			const jwtCookie = cookieHeader
				.split(';')
				.map((c) => c.trim())
				.find((c) => c.startsWith('jwt='));
			if (jwtCookie) {
				const jwtToken = jwtCookie.substring(4);
				const authenticatedUser = await getUserFromJWT(jwtToken);
				if (authenticatedUser) {
					socket.data.userId = authenticatedUser.id;
					return next();
				}
			}

			// 3. Fallback：從 handshake cookie 中讀取 auth_session (Lucia)
			const { lucia: luciaInstance } = await import('./lucia');
			const sessionCookie = cookieHeader
				.split(';')
				.map((c) => c.trim())
				.find((c) => c.startsWith(`${luciaInstance.sessionCookieName}=`));
			if (sessionCookie) {
				const sessionId = sessionCookie.substring(luciaInstance.sessionCookieName.length + 1);
				const { session, user: luciaUser } = await luciaInstance.validateSession(sessionId);
				if (session && luciaUser) {
					socket.data.userId = Number(luciaUser.id);
					return next();
				}
			}

			return next(new Error('驗證失敗，請重新登入'));
		} catch (error) {
			console.error('Socket 身份驗證錯誤:', error);
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
				addRoomConnection(roomName, userId, socket.id);

				// 更新玩家在線狀態
				await updatePlayerOnlineStatus(game.id, userId, true, game.status === 'playing');
				if (!socket.connected) {
					const remainingConnections = removeRoomConnection(roomName, userId, socket.id);
					if (remainingConnections === 0 && !hasRoomConnection(roomName, userId)) {
						await updatePlayerOnlineStatus(game.id, userId, false);
					}
					return;
				}

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
		roomConnections.clear();
	}
}

// 處理離開房間（僅處理在線狀態更新，不發送通知避免與 API 重複）
async function handleLeaveRoom(socket: Socket) {
	try {
		const userId = socket.data.userId;
		const roomName = socket.data.roomName;

		if (!roomName) return;
		const remainingConnections = removeRoomConnection(roomName, userId, socket.id);

		// 查找遊戲
		const [game] = await db.select().from(games).where(eq(games.roomName, roomName)).limit(1);

		if (game && remainingConnections === 0 && !hasRoomConnection(roomName, userId)) {
			// 更新玩家離線狀態
			await updatePlayerOnlineStatus(game.id, userId, false);
			io?.to(roomName).emit('player-offline', { userId, nickname: socket.data.nickname });
		}

		socket.leave(roomName);
		socket.data.roomName = null;
	} catch (error) {
		console.error('[handleLeaveRoom] 處理離開房間時發生錯誤:', error);
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
