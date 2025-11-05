import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// 手動處理環境變數替換
function resolveEnvironmentVariables(str: string): string {
	return str.replace(/\$\{([^}]+)}/g, (match, varName) => {
		return env[varName] || process.env[varName] || match;
	});
}

// 在測試環境中優先使用 process.env
const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;

// 在建置階段，如果沒有 DATABASE_URL，使用假的連接字串
const isBuildTime = process.env.npm_lifecycle_event === 'build' || !databaseUrl;
const resolvedDatabaseUrl =
	isBuildTime && !databaseUrl
		? 'postgres://user:pass@localhost:5432/db'
		: resolveEnvironmentVariables(databaseUrl!);

const client = postgres(resolvedDatabaseUrl, {
	max: 10,
	idle_timeout: 20,
	connect_timeout: 10
});

export const db = drizzle(client, { schema });
