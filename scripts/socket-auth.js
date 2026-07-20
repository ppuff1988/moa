import jwt from 'jsonwebtoken';

/**
 * @typedef {{ query: (text: string, values: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }} QueryPool
 */

/**
 * 建立 production Socket 驗證器。
 *
 * @param {{ pool: QueryPool; jwtSecret: string }} dependencies
 */
export function createSocketAuthenticator({ pool, jwtSecret }) {
	/**
	 * @param {string} token
	 * @returns {Promise<{ userId: number } | null>}
	 */
	async function authenticateJWT(token) {
		try {
			const payload = jwt.verify(token, jwtSecret);
			if (typeof payload === 'string' || typeof payload.userId !== 'number') return null;

			const userResult = await pool.query('SELECT token_version FROM users WHERE id = $1', [
				payload.userId
			]);
			if (userResult.rows.length === 0) return null;
			if ((payload.tokenVersion ?? 0) !== userResult.rows[0].token_version) return null;

			return { userId: payload.userId };
		} catch {
			return null;
		}
	}

	/**
	 * @param {{ token?: string; cookieHeader?: string }} credentials
	 * @returns {Promise<{ userId: number } | null>}
	 */
	return async function authenticateSocket({ token, cookieHeader = '' }) {
		if (token) {
			const authenticatedUser = await authenticateJWT(token);
			if (authenticatedUser) return authenticatedUser;
		}

		const jwtCookie = getCookie(cookieHeader, 'jwt');
		if (jwtCookie) {
			const authenticatedUser = await authenticateJWT(jwtCookie);
			if (authenticatedUser) return authenticatedUser;
		}

		const sessionId = getCookie(cookieHeader, 'auth_session');
		if (!sessionId) return null;

		const sessionResult = await pool.query(
			`SELECT s.user_id
			 FROM sessions s
			 INNER JOIN users u ON u.id = s.user_id
			 WHERE s.id = $1 AND s.expires_at > NOW()
			 LIMIT 1`,
			[sessionId]
		);
		if (sessionResult.rows.length === 0) return null;

		const userId = Number(sessionResult.rows[0].user_id);
		return Number.isInteger(userId) ? { userId } : null;
	};
}

/**
 * @param {string} cookieHeader
 * @param {string} name
 */
function getCookie(cookieHeader, name) {
	const prefix = `${name}=`;
	const cookie = cookieHeader
		.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(prefix));

	if (!cookie) return null;
	const value = cookie.slice(prefix.length);
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
