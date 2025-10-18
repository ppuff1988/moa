/**
 * 自動執行資料庫 migrations
 * 用於 CD 流程中自動套用資料庫變更
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';
import pg from 'pg';
import dotenvFlow from 'dotenv-flow';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變數（使用 dotenv-flow）
dotenvFlow.config();

const { Pool } = pg;

// 解析環境變數
function resolveEnvironmentVariables(str) {
	return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
		return process.env[varName] || match;
	});
}

const databaseUrl = resolveEnvironmentVariables(process.env.DATABASE_URL);

// 建立資料庫連線池
const pool = new Pool({
	connectionString: databaseUrl
});

async function runMigrations() {
	const client = await pool.connect();

	try {
		console.log('🚀 開始執行資料庫 migrations...');

		// 建立 migrations 追蹤表（如果不存在）
		await client.query(`
			CREATE TABLE IF NOT EXISTS schema_migrations (
				id SERIAL PRIMARY KEY,
				migration_name TEXT NOT NULL UNIQUE,
				executed_at TIMESTAMP DEFAULT NOW()
			);
		`);

		// 讀取已執行的 migrations
		const executedResult = await client.query(
			'SELECT migration_name FROM schema_migrations ORDER BY id'
		);
		const executedMigrations = new Set(executedResult.rows.map((row) => row.migration_name));

		// 讀取 migrations 資料夾中的檔案
		const migrationsDir = join(__dirname, '..', 'migrations');
		const files = await readdir(migrationsDir);

		// 只處理 .sql 檔案，並排除 init_database.sql 等初始化檔案
		const migrationFiles = files
			.filter((file) => file.endsWith('.sql') && file.match(/^\d{4}_/))
			.sort(); // 按檔名排序（數字前綴確保順序）

		if (migrationFiles.length === 0) {
			console.log('ℹ️  沒有發現需要執行的 migration 檔案');
			return;
		}

		let executed = 0;

		for (const file of migrationFiles) {
			// 跳過已執行的 migrations
			if (executedMigrations.has(file)) {
				console.log(`⏭️  跳過已執行: ${file}`);
				continue;
			}

			console.log(`📝 執行 migration: ${file}`);

			try {
				// 讀取 SQL 檔案
				const { readFile } = await import('fs/promises');
				const sqlPath = join(migrationsDir, file);
				const sql = await readFile(sqlPath, 'utf-8');

				// 在 transaction 中執行
				await client.query('BEGIN');

				// 執行 SQL
				await client.query(sql);

				// 記錄執行
				await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [file]);

				await client.query('COMMIT');

				console.log(`✅ 完成: ${file}`);
				executed++;
			} catch (error) {
				await client.query('ROLLBACK');
				console.error(`❌ 失敗: ${file}`);
				console.error(error);
				throw error; // 停止執行後續 migrations
			}
		}

		if (executed === 0) {
			console.log('✨ 所有 migrations 都已是最新狀態');
		} else {
			console.log(`🎉 成功執行 ${executed} 個 migration(s)`);
		}
	} catch (error) {
		console.error('💥 Migration 執行失敗:', error);
		process.exit(1);
	} finally {
		client.release();
		await pool.end();
	}
}

// 執行
runMigrations();
