import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { Google } from 'arctic';
import { eq, lt } from 'drizzle-orm';
import type { Adapter, DatabaseSession, DatabaseUser, UserId } from 'lucia';
import { Lucia, TimeSpan } from 'lucia';
import { db } from './db';
import { session, user } from './db/schema';

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
	sessionExpiresIn: new TimeSpan(30, 'd'), // Session 30 天後過期
	sessionCookie: {
		name: 'auth_session', // 明確指定 cookie 名稱
		expires: true, // 設置過期時間（持久性 cookie）
		attributes: {
			secure: !dev, // 開發環境 false，生產環境 true
			sameSite: 'lax', // 防止 CSRF，允許跨站導航時攜帶
			path: '/' // 全站可用
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
