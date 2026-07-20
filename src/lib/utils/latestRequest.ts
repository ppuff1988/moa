export function createLatestRequestTracker() {
	let sequence = 0;

	return {
		start() {
			return ++sequence;
		},
		isLatest(requestSequence: number) {
			return requestSequence === sequence;
		},
		invalidate() {
			sequence += 1;
		}
	};
}
