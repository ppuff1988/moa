import { io, type Socket } from 'socket.io-client';
import { getJWTToken } from './jwt';

let socket: Socket | null = null;
let isInitialized = false; // 追蹤是否已經初始化過監聽器

export function initSocket(): Socket {
	// 如果已經連接，直接返回（不重新初始化）
	if (socket?.connected) {
		return socket;
	}

	// 如果 socket 存在但未連接，先清理
	if (socket && !socket.connected) {
		socket.removeAllListeners();
		socket.disconnect();
		socket = null;
		isInitialized = false;
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

	// 只在第一次初始化時註冊這些全局監聽器
	if (!isInitialized) {
		socket.on('connect', () => {
			// Socket connected
		});

		socket.on('disconnect', () => {
			// Socket disconnected
		});

		socket.on('connect_error', () => {
			// Socket connection error
		});

		isInitialized = true;
	}

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
		socket.removeAllListeners();
		socket.disconnect();
		socket = null;
		isInitialized = false;
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
