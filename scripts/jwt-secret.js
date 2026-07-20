const MIN_PRODUCTION_SECRET_LENGTH = 32;
const EXAMPLE_SECRET_PATTERNS = [/change[-_ ]?this/i, /^your[-_]/i, /example/i, /fallback/i];

/**
 * @param {{ jwtSecret?: string; nodeEnv?: string }} configuration
 */
export function requireJwtSecret({ jwtSecret, nodeEnv }) {
	const secret = jwtSecret?.trim();

	if (!secret) {
		throw new Error('JWT_SECRET is required');
	}

	if (nodeEnv === 'production') {
		if (secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
			throw new Error(
				`JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`
			);
		}

		if (EXAMPLE_SECRET_PATTERNS.some((pattern) => pattern.test(secret))) {
			throw new Error('JWT_SECRET must not use an example value in production');
		}
	}

	return secret;
}
