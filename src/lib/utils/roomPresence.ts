import type { Player } from '$lib/types/game';

/**
 * Apply the public presence snapshot from Socket.IO without replacing
 * private fields populated by the authenticated players endpoint.
 */
export function mergeRoomPresence(currentPlayers: Player[], incomingPlayers: Player[]): Player[] {
	const currentById = new Map(currentPlayers.map((player) => [String(player.id), player]));
	const currentByUserId = new Map(currentPlayers.map((player) => [player.userId, player]));

	return incomingPlayers.map((incomingPlayer) => {
		const currentPlayer =
			currentById.get(String(incomingPlayer.id)) ?? currentByUserId.get(incomingPlayer.userId);

		if (!currentPlayer) return incomingPlayer;

		return {
			...currentPlayer,
			isOnline: incomingPlayer.isOnline,
			roomPresence: incomingPlayer.roomPresence ?? currentPlayer.roomPresence,
			leftAt: incomingPlayer.leftAt === undefined ? currentPlayer.leftAt : incomingPlayer.leftAt
		};
	});
}
