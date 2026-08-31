import { describe, expect, it } from 'vitest';

import { resolveApiTestEndpoint } from '../../../../scripts/api-test-endpoint.js';

describe('API test endpoint configuration', () => {
	it('uses an isolated default port', () => {
		expect(resolveApiTestEndpoint({})).toEqual({
			apiBaseUrl: 'http://localhost:5174',
			serverPort: 5174
		});
	});

	it('derives the spawned server port from an explicit API URL', () => {
		expect(resolveApiTestEndpoint({ apiBaseUrl: 'http://127.0.0.1:55417' })).toEqual({
			apiBaseUrl: 'http://127.0.0.1:55417',
			serverPort: 55417
		});
	});

	it('builds the API URL from an explicit test server port', () => {
		expect(resolveApiTestEndpoint({ testServerPort: '55174' })).toEqual({
			apiBaseUrl: 'http://localhost:55174',
			serverPort: 55174
		});
	});

	it('rejects conflicting URL and server port overrides', () => {
		expect(() =>
			resolveApiTestEndpoint({
				apiBaseUrl: 'http://localhost:55174',
				testServerPort: '55175'
			})
		).toThrow('API_BASE_URL port 55174 does not match TEST_SERVER_PORT 55175');
	});
});
