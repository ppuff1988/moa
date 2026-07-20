/**
 * actionOrder stores the current/latest player first. Players that already had
 * their turn remain behind the current player, even when they performed no
 * action and therefore have no gameActions row.
 */
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
