import { Lucia } from 'lucia';
import { db } from './db';
import { session, user } from './db/schema';
import { dev } from '$app/environment';
import { Google } from 'arctic';
import { env } from '$env/dynamic/private';
import { eq, lt } from 'drizzle-orm';
import type { Adapter, DatabaseSession, DatabaseUser, UserId } from 'lucia';

// 自訂適配器以支援 integer userId
const adapter: Adapter = {
	async getSessionAndUser(
		sessionId: string
	): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
		try {
			const result = await db
				.select({
					session: session,
					user: user
				})
				.from(session)
				.innerJoin(user, eq(session.userId, user.id))
				.where(eq(session.id, sessionId))
				.limit(1);

			if (result.length === 0) return [null, null];

			return [
				{
					id: result[0].session.id,
					userId: String(result[0].session.userId),
					expiresAt: result[0].session.expiresAt,
					attributes: {}
				},
				{
					id: String(result[0].user.id),
					attributes: {
						email: result[0].user.email,
						nickname: result[0].user.nickname
					}
				}
			];
		} catch (error) {
			console.error('getSessionAndUser error:', error);
			console.error('sessionId:', sessionId);
			return [null, null];
		}
	},

	async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
		const sessions = await db
			.select()
			.from(session)
			.where(eq(session.userId, Number(userId)));

		return sessions.map((s) => ({
			id: s.id,
			userId: String(s.userId),
			expiresAt: s.expiresAt,
			attributes: {}
		}));
	},

	async setSession(databaseSession: DatabaseSession): Promise<void> {
		await db.insert(session).values({
			id: databaseSession.id,
			userId: Number(databaseSession.userId),
			expiresAt: databaseSession.expiresAt
		});
	},

	async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
		await db.update(session).set({ expiresAt }).where(eq(session.id, sessionId));
	},

	async deleteSession(sessionId: string): Promise<void> {
		await db.delete(session).where(eq(session.id, sessionId));
	},

	async deleteUserSessions(userId: UserId): Promise<void> {
		await db.delete(session).where(eq(session.userId, Number(userId)));
	},

	async deleteExpiredSessions(): Promise<void> {
		const now = new Date();
		await db.delete(session).where(lt(session.expiresAt, now));
	}
};

// 初始化 Lucia
export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// 在開發環境中設定為 false，生產環境設定為 true
			secure: !dev
		}
	},
	getUserAttributes: (attributes) => {
		return {
			email: attributes.email,
			nickname: attributes.nickname
		};
	}
});

// 初始化 Google OAuth
export const google = new Google(
	env.GOOGLE_CLIENT_ID || '',
	env.GOOGLE_CLIENT_SECRET || '',
	env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback'
);

// 擴展 Lucia 型別
declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	email: string;
	nickname: string;
}
