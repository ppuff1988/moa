interface RequestNextRoundOptions {
	roomName: string;
	currentRound: number;
	onNextRound: () => void | Promise<void>;
	onSynchronizationError?: (error: unknown) => void;
	fetcher?: typeof fetch;
}

interface SynchronizeNextRoundOptions {
	fetchArtifacts: () => Promise<boolean>;
	updatePlayersAndRound: () => Promise<boolean>;
	fetchRoundStatus: () => Promise<boolean>;
}

export async function synchronizeNextRound({
	fetchArtifacts,
	updatePlayersAndRound,
	fetchRoundStatus
}: SynchronizeNextRoundOptions): Promise<void> {
	const artifactsLoaded = await fetchArtifacts();
	const playersLoaded = await updatePlayersAndRound();
	const roundStatusLoaded = await fetchRoundStatus();

	if (!artifactsLoaded || !playersLoaded || !roundStatusLoaded) {
		throw new Error('下一回合資料同步失敗');
	}
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
