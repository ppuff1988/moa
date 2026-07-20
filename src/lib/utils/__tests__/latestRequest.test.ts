import { describe, expect, it } from 'vitest';
import { createLatestRequestTracker } from '../latestRequest';

describe('createLatestRequestTracker', () => {
	it('套用較新的權威狀態後，會使所有在途請求失效', () => {
		const tracker = createLatestRequestTracker();
		const staleRequest = tracker.start();

		expect(tracker.isLatest(staleRequest)).toBe(true);

		tracker.invalidate();

		expect(tracker.isLatest(staleRequest)).toBe(false);
	});

	it('只有最後啟動的重疊請求可以套用結果', () => {
		const tracker = createLatestRequestTracker();
		const firstRequest = tracker.start();
		const secondRequest = tracker.start();

		expect(tracker.isLatest(firstRequest)).toBe(false);
		expect(tracker.isLatest(secondRequest)).toBe(true);
	});
});
