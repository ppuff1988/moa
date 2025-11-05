import type { User, Session } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
	}

	interface Window {
		dataLayer: Record<string, unknown>[];
	}
}

// 環境變數型別定義
declare module '$env/static/private' {
	export const POSTGRES_USER: string;
	export const POSTGRES_PASSWORD: string;
	export const POSTGRES_DB: string;
	export const POSTGRES_HOST: string;
	export const POSTGRES_PORT: string;
	export const DATABASE_URL: string;
	export const JWT_SECRET: string;
	export const JWT_EXPIRES_IN: string;
	export const GOOGLE_CLIENT_ID: string;
	export const GOOGLE_CLIENT_SECRET: string;
	export const GOOGLE_REDIRECT_URI: string;
	export const SMTP_HOST: string;
	export const SMTP_PORT: string;
	export const SMTP_SECURE: string;
	export const SMTP_USER: string;
	export const SMTP_PASSWORD: string;
	export const SMTP_FROM_EMAIL: string;
	export const SMTP_FROM_NAME: string;
	export const DEPLOY_URL: string;
}

declare module '$env/static/public' {
	export const PUBLIC_BASE_URL: string;
}

export {};
