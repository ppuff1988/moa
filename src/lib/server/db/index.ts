import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// 手動處理環境變數替換
function resolveEnvironmentVariables(str: string | undefined): string {
	// 如果 str 是 undefined 或空，返回空字串
	if (!str) {
		return '';
	}
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
		: resolveEnvironmentVariables(databaseUrl);

// 日誌記錄（僅在非生產環境）
if (process.env.NODE_ENV !== 'production' && !isBuildTime) {
	console.log('🔌 資料庫連接:', resolvedDatabaseUrl.replace(/:[^:@]+@/, ':***@'));
}

const client = postgres(resolvedDatabaseUrl, {
	max: 10,
	idle_timeout: 20,
	connect_timeout: 10,
	onnotice: () => {}, // 靜默通知
	debug: process.env.NODE_ENV === 'development' ? console.log : undefined
});

// 測試連接（僅在非建置時）
if (!isBuildTime) {
	client`SELECT 1`
		.then(() => {
			if (process.env.NODE_ENV !== 'production') {
				console.log('✅ 資料庫連接成功');
			}
		})
		.catch((error) => {
			console.error('❌ 資料庫連接失敗:', error.message);
			console.error('請確保資料庫正在運行並且環境變數配置正確');
		});
}

export const db = drizzle(client, { schema });
