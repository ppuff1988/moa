import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { getGameState } from '$lib/server/game';
import { leaveRoom } from '$lib/server/game-room-leave';
import {
	enqueuePresenceTransition,
	getSocketIO,
	removePlayerSocketsFromRoom
} from '$lib/server/socket';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
	const verified = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verified) return verified.error;
	const { user: currentUser, game } = verified;
	const transition = await enqueuePresenceTransition(game.roomName, currentUser.id, () =>
		leaveRoom(game.id, currentUser.id)
	);
	await removePlayerSocketsFromRoom(game.roomName, currentUser.id);
	const io = getSocketIO();
	const playerLeft = { userId: currentUser.id, nickname: currentUser.nickname };

	if (transition.endedReason) {
		io?.to(game.roomName).emit('game-force-ended', {
			reason: transition.endedReason,
			playerLeft
		});
		return json({
			message: transition.endedReason,
			roomName: game.roomName,
			gameEnded: true,
			gamePaused: false
		});
	}

	if (transition.status === 'playing') {
		io?.to(game.roomName).emit('player-left-room', playerLeft);
		return json({
			message: '已離開房間，請重新加入以回到遊戲',
			roomName: game.roomName,
			gamePaused: true
		});
	}

	if (io && ['waiting', 'selecting'].includes(transition.status)) {
		const state = await getGameState(game.id);
		io.to(game.roomName).emit('room-update', { game: state.game, players: state.players });
		io.to(game.roomName).emit('player-left', {
			...playerLeft,
			...(transition.newHost ? { newHost: transition.newHost } : {})
		});
	}
	return json({
		message: transition.newHost ? '成功離開房間，已轉移房主' : '成功離開房間',
		roomName: game.roomName,
		...(transition.newHost ? { newHostId: transition.newHost.userId } : {})
	});
};
