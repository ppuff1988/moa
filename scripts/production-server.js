import dotenvFlow from 'dotenv-flow';
import dotenvExpand from 'dotenv-expand';
import { handler } from '../build/handler.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pg from 'pg';
import { createSocketAuthenticator } from './socket-auth.js';
import { requireJwtSecret } from './jwt-secret.js';

// 先加载環境變數量，再展开变量替换
const myEnv = dotenvFlow.config();
dotenvExpand.expand(myEnv);

const { Pool } = pg;
const jwtSecret = requireJwtSecret({
	jwtSecret: process.env.JWT_SECRET,
	nodeEnv: process.env.NODE_ENV
});

const app = express();
const server = createServer(app);

// 初始化資料庫連接
const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL || 'postgresql://moa_user:moa_pass@localhost:5432/moa_db'
});
const authenticateSocket = createSocketAuthenticator({
	pool,
	jwtSecret
});

// 初始化 Socket.IO
try {
	const io = new Server(server, {
		cors: {
			origin: '*',
			methods: ['GET', 'POST']
		},
		path: '/socket.io/',
		transports: ['polling', 'websocket']
	});

	// 身份驗證中間件
	io.use(async (socket, next) => {
		try {
			const authenticatedUser = await authenticateSocket({
				token:
					typeof socket.handshake.auth.token === 'string' ? socket.handshake.auth.token : undefined,
				cookieHeader: socket.handshake.headers.cookie || ''
			});
			if (!authenticatedUser) {
				return next(new Error('無效的驗證令牌'));
			}

			socket.data.userId = authenticatedUser.userId;
			next();
		} catch {
			next(new Error('驗證失敗，請重新登入'));
		}
	});

	// 房間玩家映射
	const roomUsers = new Map();

	// 連接處理
	io.on('connection', async (socket) => {
		const userId = socket.data.userId;
		console.log(`📱 用戶已連線: ${userId} (Socket ID: ${socket.id})`);

		// 讓用戶加入自己的個人房間
		socket.join(`user-${userId}`);

		// 加入房間
		socket.on('join-room', async (roomName) => {
			try {
				console.log(`[Socket] 用戶 ${userId} 嘗試加入房間: ${roomName}`);

				// 查詢遊戲和玩家信息
				const gameResult = await pool.query('SELECT * FROM games WHERE room_name = $1', [roomName]);

				if (gameResult.rows.length === 0) {
					socket.emit('error', { message: '房間不存在' });
					return;
				}

				const game = gameResult.rows[0];
				const gameId = game.id;

				const playerResult = await pool.query(
					'SELECT * FROM game_players WHERE game_id = $1 AND user_id = $2',
					[gameId, userId]
				);

				if (playerResult.rows.length === 0) {
					socket.emit('error', { message: '您不在此房間中' });
					return;
				}

				// 獲取用戶信息（包含頭像）
				const userResult = await pool.query('SELECT nickname, avatar FROM users WHERE id = $1', [
					userId
				]);
				const nickname = userResult.rows[0]?.nickname || `玩家${userId}`;
				const avatar = userResult.rows[0]?.avatar || null;

				// 加入 Socket.IO 房間
				socket.join(roomName);
				socket.data.roomName = roomName;
				socket.data.nickname = nickname;
				socket.data.avatar = avatar;

				// 更新玩家在線狀態
				await pool.query(
					'UPDATE game_players SET is_online = true, last_active_at = NOW() WHERE game_id = $1 AND user_id = $2',
					[gameId, userId]
				);

				// 記錄房間用戶
				if (!roomUsers.has(roomName)) {
					roomUsers.set(roomName, new Set());
				}
				roomUsers.get(roomName).add(userId);

				console.log(`✅ 用戶 ${userId} (${nickname}) 成功加入房間: ${roomName}`);

				// 獲取更新的遊戲狀態和所有玩家資訊
				const playersResult = await pool.query(
					`SELECT 
						gp.id,
						gp.game_id,
						gp.user_id,
						gp.role_id,
						gp.color,
						gp.color_code,
						gp.is_host,
						gp.is_ready,
						gp.is_online,
						gp.can_action,
						gp.joined_at,
						gp.last_active_at,
						u.nickname,
						u.avatar
					FROM game_players gp
					LEFT JOIN users u ON gp.user_id = u.id
					WHERE gp.game_id = $1
					ORDER BY gp.joined_at`,
					[gameId]
				);

				// 廣播房間更新給所有玩家（包括剛加入的玩家）
				io.to(roomName).emit('room-update', {
					game: {
						id: game.id,
						roomName: game.room_name,
						status: game.status,
						currentTurn: game.current_turn,
						hostId: game.host_id,
						createdAt: game.created_at,
						startedAt: game.started_at,
						endedAt: game.ended_at
					},
					players: playersResult.rows.map((p) => ({
						id: p.id,
						gameId: p.game_id,
						userId: p.user_id,
						roleId: p.role_id,
						color: p.color,
						colorCode: p.color_code,
						isHost: p.is_host,
						isReady: p.is_ready,
						isOnline: p.is_online,
						canAction: p.can_action,
						joinedAt: p.joined_at,
						lastActiveAt: p.last_active_at,
						nickname: p.nickname,
						avatar: p.avatar
					}))
				});

				// 通知其他玩家有新玩家加入
				socket.to(roomName).emit('player-joined', {
					userId,
					nickname,
					avatar
				});
			} catch (error) {
				console.error('[Socket] 加入房間錯誤:', error);
				socket.emit('error', { message: '加入房間失敗' });
			}
		});

		// 離開房間
		socket.on('leave-room', async () => {
			try {
				const roomName = socket.data.roomName;
				const nickname = socket.data.nickname || `玩家${userId}`;

				console.log(`[leave-room] 用戶 ${userId} (${nickname}) 嘗試離開房間: ${roomName}`);

				if (!roomName) {
					console.log(`[leave-room] 用戶 ${userId} 尚未加入任何房間`);
					return;
				}

				// 查詢遊戲
				const gameResult = await pool.query('SELECT id FROM games WHERE room_name = $1', [
					roomName
				]);

				if (gameResult.rows.length > 0) {
					const gameId = gameResult.rows[0].id;

					// 更新玩家離線狀態
					await pool.query(
						'UPDATE game_players SET is_online = false, last_active_at = NOW() WHERE game_id = $1 AND user_id = $2',
						[gameId, userId]
					);

					console.log(`[leave-room] 已更新用戶 ${userId} 的離線狀態`);

					// 從房間用戶列表移除
					if (roomUsers.has(roomName)) {
						roomUsers.get(roomName).delete(userId);
						if (roomUsers.get(roomName).size === 0) {
							roomUsers.delete(roomName);
						}
					}

					// 獲取更新的遊戲狀態和所有玩家資訊
					const playersResult = await pool.query(
						`SELECT 
							gp.id,
							gp.game_id,
							gp.user_id,
							gp.role_id,
							gp.color,
							gp.color_code,
							gp.is_host,
							gp.is_ready,
							gp.is_online,
							gp.can_action,
							gp.joined_at,
							gp.last_active_at,
							u.nickname,
							u.avatar
						FROM game_players gp
						LEFT JOIN users u ON gp.user_id = u.id
						WHERE gp.game_id = $1
						ORDER BY gp.joined_at`,
						[gameId]
					);

					const gameDataResult = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
					const game = gameDataResult.rows[0];

					// 通知房間內其他玩家
					socket.to(roomName).emit('room-update', {
						game: {
							id: game.id,
							roomName: game.room_name,
							status: game.status,
							currentTurn: game.current_turn,
							hostId: game.host_id,
							createdAt: game.created_at,
							startedAt: game.started_at,
							endedAt: game.ended_at
						},
						players: playersResult.rows.map((p) => ({
							id: p.id,
							gameId: p.game_id,
							userId: p.user_id,
							roleId: p.role_id,
							color: p.color,
							colorCode: p.color_code,
							isHost: p.is_host,
							isReady: p.is_ready,
							isOnline: p.is_online,
							canAction: p.can_action,
							joinedAt: p.joined_at,
							lastActiveAt: p.last_active_at,
							nickname: p.nickname,
							avatar: p.avatar
						}))
					});

					socket.to(roomName).emit('player-left', {
						userId,
						nickname
					});

					console.log(
						`[leave-room] ✅ 用戶 ${userId} (${nickname}) 已離開房間: ${roomName}，並通知其他玩家`
					);
				}

				// 從 Socket.IO 房間離開
				socket.leave(roomName);
				socket.data.roomName = null;
				socket.data.nickname = null;
			} catch (error) {
				console.error('[leave-room] 錯誤:', error);
				socket.emit('error', { message: '離開房間失敗' });
			}
		});

		// 斷線處理
		socket.on('disconnect', async () => {
			console.log(`用戶 ${userId} 已斷線`);

			const roomName = socket.data.roomName;
			if (roomName) {
				// 更新玩家離線狀態
				try {
					const gameResult = await pool.query('SELECT id FROM games WHERE room_name = $1', [
						roomName
					]);

					if (gameResult.rows.length > 0) {
						await pool.query(
							'UPDATE game_players SET is_online = false WHERE game_id = $1 AND user_id = $2',
							[gameResult.rows[0].id, userId]
						);
					}

					// 移除房間用戶記錄
					if (roomUsers.has(roomName)) {
						roomUsers.get(roomName).delete(userId);
						if (roomUsers.get(roomName).size === 0) {
							roomUsers.delete(roomName);
						}
					}

					// 廣播玩家離線事件
					io.to(roomName).emit('player-offline', { userId });
				} catch (error) {
					console.error('[Socket] 更新離線狀態錯誤:', error);
				}
			}
		});
	});

	// 將 io 實例掛載到 global，供 API 路由使用
	global.io = io;

	console.log('✓ Socket.IO 已初始化');
} catch (error) {
	console.warn('⚠️  Socket.IO 初始化失敗:', error.message);
	console.warn('   應用將在沒有 Socket.IO 的情況下運行');
}

// 使用 SvelteKit handler
app.use(handler);

const port = process.env.PORT || process.env.SOCKET_PORT || 5173;
server.listen(port, () => {
	console.log(`🚀 服務器運行在端口 ${port}`);
	console.log(`   http://localhost:${port}`);
	console.log(`💡 Socket.IO 端點: http://localhost:${port}/socket.io/`);
});

// 優雅關閉
process.on('SIGTERM', async () => {
	console.log('收到 SIGTERM 信號，正在關閉...');
	await pool.end();
	server.close();
});
