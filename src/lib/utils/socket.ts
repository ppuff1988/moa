import { io, type Socket } from 'socket.io-client';
import { getJWTToken } from './jwt';

let socket: Socket | null = null;

export function initSocket(): Socket {
	if (socket?.connected) {
		return socket;
	}

	const token = getJWTToken();
	if (!token) {
		throw new Error('未找到身份token');
	}

	socket = io({
		path: '/socket.io/',
		auth: {
			token
		},
		autoConnect: true,
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 5000,
		reconnectionAttempts: 5,
		// 在開發環境中使用 polling，避免需要自定義服務器
		transports: ['polling', 'websocket']
	});

	socket.on('connect', () => {
		console.log('[🔌 Socket 連接] 已成功連接', {
			socketId: socket?.id,
			transport: socket?.io.engine.transport.name,
			時間: new Date().toLocaleTimeString()
		});
	});

	socket.on('disconnect', (reason) => {
		console.log('[🔌 Socket 斷線] 連接已斷開', {
			原因: reason,
			時間: new Date().toLocaleTimeString()
		});
	});

	socket.on('connect_error', (error) => {
		console.error('[🔌 Socket 錯誤] 連接發生錯誤', {
			錯誤訊息: error.message,
			錯誤類型: error.name,
			時間: new Date().toLocaleTimeString()
		});
	});

	return socket;
}

// connectSocket 作為 initSocket 的別名
export function connectSocket(): Socket {
	return initSocket();
}

export function getSocket(): Socket | null {
	return socket;
}

export function disconnectSocket(): void {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
}

export function joinRoom(roomName: string): void {
	if (!socket) {
		throw new Error('Socket 尚未初始化');
	}
	socket.emit('加入房間', roomName);
}

export function leaveRoom(): void {
	if (!socket) {
		throw new Error('Socket 尚未初始化');
	}
	socket.emit('離開房間');
}

export function selectRole(roleId: number, color: string): void {
	if (!socket) {
		throw new Error('Socket 尚未初始化');
	}
	socket.emit('選擇角色', { roleId, color });
}

export function toggleReady(isReady: boolean): void {
	if (!socket) {
		throw new Error('Socket 尚未初始化');
	}
	socket.emit('切換準備狀態', isReady);
}
