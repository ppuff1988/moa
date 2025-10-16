import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

// 手動處理環境變數替換
function resolveEnvironmentVariables(str: string): string {
	return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
		return process.env[varName] || match;
	});
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// 解析參數化的 DATABASE_URL
const resolvedDatabaseUrl = resolveEnvironmentVariables(process.env.DATABASE_URL);

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: resolvedDatabaseUrl },
	verbose: true,
	strict: true
});
