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

/**
 * 為用戶生成 JWT token（不設定 cookie）
 * 用於 API endpoint 返回 token
 *
 * @param user - 用戶資料
 * @returns JWT token 字串
 */
export function generateUserJWT(user: { id: number; email: string }): string {
	const jwtPayload: JWTPayload = {
		userId: user.id,
		email: user.email
	};
	return generateJWT(jwtPayload);
}

/**
 * 生成 JWT token 並設定為 httpOnly cookie
 * 用於 OAuth 登入流程，提供更高的安全性
 *
 * @param user - 用戶資料
 * @param cookies - SvelteKit cookies 物件
 * @returns JWT token 字串
 */
export function generateAndSetJWTCookie(
	user: { id: number; email: string },
	cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void }
): string {
	const token = generateUserJWT(user);

	// 設定 JWT cookie (httpOnly=true，防止 XSS 攻擊)
	cookies.set('jwt', token, {
		path: '/',
		httpOnly: true, // 防止 JavaScript 讀取，提高安全性
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30 // 30 天
	});

	return token;
}
