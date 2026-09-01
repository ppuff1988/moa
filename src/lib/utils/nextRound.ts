interface RequestNextRoundOptions {
	roomName: string;
	currentRound: number;
	onNextRound: () => void | Promise<void>;
	onSynchronizationError?: (error: unknown) => void;
	fetcher?: typeof fetch;
}

export async function requestNextRound({
	roomName,
	currentRound,
	onNextRound,
	onSynchronizationError,
	fetcher = fetch
}: RequestNextRoundOptions): Promise<Response> {
	const response = await fetcher(`/api/room/${encodeURIComponent(roomName)}/start`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ round: currentRound + 1 })
	});

	if (response.ok) {
		try {
			await onNextRound();
		} catch (error) {
			onSynchronizationError?.(error);
		}
	}
	return response;
}
