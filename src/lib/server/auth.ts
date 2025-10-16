import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { user, type User } from './db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = env.JWT_SECRET || 'fallback-secret-key-for-development';
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN || '30d';

export interface JWTPayload {
	userId: number;
	email: string;
}

export interface JWTVerifyResult {
	payload: JWTPayload | null;
	error?: 'expired' | 'invalid';
}

export function generateUserId(): string {
	return crypto.randomUUID();
}

export function generateJWT(payload: JWTPayload): string {
	if (!JWT_SECRET) {
		throw new Error('JWT_SECRET is not configured');
	}
	return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyJWT(token: string): JWTPayload | null {
	try {
		if (!JWT_SECRET) {
			return null;
		}
		return jwt.verify(token, JWT_SECRET) as JWTPayload;
	} catch (error) {
		// jwt.verify() 會在 token 過期或無效時拋出錯誤
		// TokenExpiredError: token 過期
		// JsonWebTokenError: token 格式錯誤或簽名無效
		if (error instanceof Error && error.name === 'TokenExpiredError') {
			console.log('JWT token 已過期');
		} else if (error instanceof Error && error.name === 'JsonWebTokenError') {
			console.log('JWT token 無效:', error.message);
		}
		return null;
	}
}

export function verifyJWTWithError(token: string): JWTVerifyResult {
	try {
		if (!JWT_SECRET) {
			return { payload: null, error: 'invalid' };
		}
		const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
		return { payload };
	} catch (error) {
		// 區分過期錯誤和其他錯誤
		if (error instanceof Error && error.name === 'TokenExpiredError') {
			return { payload: null, error: 'expired' };
		}
		return { payload: null, error: 'invalid' };
	}
}

export async function getUserFromJWT(token: string): Promise<User | null> {
	const payload = verifyJWT(token);
	if (!payload) return null;

	try {
		const foundUser = await db.select().from(user).where(eq(user.id, payload.userId)).limit(1);

		return foundUser.length > 0 ? foundUser[0] : null;
	} catch {
		return null;
	}
}
