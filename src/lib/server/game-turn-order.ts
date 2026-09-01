/**
 * actionOrder stores the current/latest player first. Players that already had
 * their turn remain behind the current player, even when they performed no
 * action and therefore have no gameActions row.
 */
export function getNextRoundStarter(actionOrder: unknown): number | null {
	if (!Array.isArray(actionOrder) || actionOrder.length === 0) return null;

	const playerId = Number(actionOrder[0]);
	return Number.isInteger(playerId) ? playerId : null;
}

export function hasPlayerTakenTurn(actionOrder: unknown, playerId: number): boolean {
	if (!Array.isArray(actionOrder)) return false;

	// Index 0 is the player whose turn is currently in progress. Only players
	// behind them have completed/passed their turn.
	return actionOrder.slice(1).some((orderedPlayerId) => Number(orderedPlayerId) === playerId);
}

export function getAttackedRound(
	currentRound: number,
	actionOrder: unknown,
	targetPlayerId: number
): number {
	return hasPlayerTakenTurn(actionOrder, targetPlayerId) ? currentRound + 1 : currentRound;
}

interface OrderedPlayerSource {
	id: number;
	nickname: string;
	color: string | null;
	colorCode: string | null;
}

export interface RoundPlayerOrderItem {
	playerId: number;
	nickname: string;
	color: string | null;
	colorCode: string | null;
	position: number;
}

export function buildRoundPlayerOrder(
	actionOrder: unknown,
	players: OrderedPlayerSource[]
): RoundPlayerOrderItem[] {
	if (!Array.isArray(actionOrder)) return [];

	const playersById = new Map(players.map((player) => [player.id, player]));
	return [...actionOrder]
		.reverse()
		.map((playerId) => playersById.get(Number(playerId)))
		.filter((player): player is OrderedPlayerSource => Boolean(player))
		.map((player, index) => ({
			playerId: player.id,
			nickname: player.nickname,
			color: player.color,
			colorCode: player.colorCode,
			position: index + 1
		}));
}
