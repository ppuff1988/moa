const DEFAULT_TEST_SERVER_PORT = 5174;

/**
 * @param {string | number} value
 * @param {string} name
 */
function parsePort(value, name) {
	const port = Number(value);
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error(`${name} must be an integer between 1 and 65535`);
	}
	return port;
}

/**
 * @param {{ apiBaseUrl?: string, testServerPort?: string | number }} [options]
 */
export function resolveApiTestEndpoint({ apiBaseUrl, testServerPort } = {}) {
	const explicitPort = testServerPort ? parsePort(testServerPort, 'TEST_SERVER_PORT') : undefined;

	if (!apiBaseUrl) {
		const serverPort = explicitPort ?? DEFAULT_TEST_SERVER_PORT;
		return {
			apiBaseUrl: `http://localhost:${serverPort}`,
			serverPort
		};
	}

	let url;
	try {
		url = new URL(apiBaseUrl);
	} catch {
		throw new Error('API_BASE_URL must be a valid absolute URL');
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('API_BASE_URL must use http or https');
	}

	const urlPort = parsePort(
		url.port || (url.protocol === 'https:' ? '443' : '80'),
		'API_BASE_URL port'
	);
	if (explicitPort !== undefined && explicitPort !== urlPort) {
		throw new Error(`API_BASE_URL port ${urlPort} does not match TEST_SERVER_PORT ${explicitPort}`);
	}

	return {
		apiBaseUrl,
		serverPort: urlPort
	};
}
