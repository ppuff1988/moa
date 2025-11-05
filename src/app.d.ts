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

// 動態環境變數型別定義
declare module '$env/dynamic/private' {
	export const env: {
		POSTGRES_USER?: string;
		POSTGRES_PASSWORD?: string;
		POSTGRES_DB?: string;
		POSTGRES_HOST?: string;
		POSTGRES_PORT?: string;
		DATABASE_URL?: string;
		JWT_SECRET?: string;
		JWT_EXPIRES_IN?: string;
		GOOGLE_CLIENT_ID?: string;
		GOOGLE_CLIENT_SECRET?: string;
		GOOGLE_REDIRECT_URI?: string;
		SMTP_HOST?: string;
		SMTP_PORT?: string;
		SMTP_SECURE?: string;
		SMTP_USER?: string;
		SMTP_PASSWORD?: string;
		SMTP_FROM_EMAIL?: string;
		SMTP_FROM_NAME?: string;
		DEPLOY_URL?: string;
		[key: string]: string | undefined;
	};
}

export {};
