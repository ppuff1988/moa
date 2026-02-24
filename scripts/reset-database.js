/**
 * 資料庫重置腳本
 * 用於重置資料庫結構並載入測試資料
 */
import { execSync } from 'child_process';
import dotenvFlow from 'dotenv-flow';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變數（使用 dotenv-flow）
dotenvFlow.config();

const { Pool } = pg;

// 顏色輸出
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m'
};

function log(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

// 解析環境變數
function resolveEnvironmentVariables(str) {
	if (!str) return str;
	return str.replace(/\$\{([^}]+)}/g, (match, varName) => {
		return process.env[varName] || match;
	});
}

const databaseUrl = resolveEnvironmentVariables(process.env.DATABASE_URL);

// 檢查 DATABASE_URL 是否存在
if (!databaseUrl) {
	log('❌ DATABASE_URL 環境變數未設定', 'red');
	log('請確保在環境中設定 DATABASE_URL', 'yellow');
	process.exit(1);
}

// 建立資料庫連線池
const pool = new Pool({
	connectionString: databaseUrl
});

async function resetDatabase() {
	const client = await pool.connect();

	try {
		log('🔄 開始重置資料庫...', 'yellow');

		// 檢查資料庫連線
		log('📡 檢查資料庫連線...', 'yellow');
		await client.query('SELECT 1');
		log('✅ 資料庫連線正常', 'green');

		// 執行初始化 SQL
		const initDbPath = join(__dirname, '..', 'migrations', 'init_database.sql');
		if (!existsSync(initDbPath)) {
			log('❌ 找不到 migrations/init_database.sql', 'red');
			process.exit(1);
		}

		log('🗄️  執行資料庫初始化...', 'yellow');
		const initDbSql = await readFile(initDbPath, 'utf-8');
		await client.query(initDbSql);
		log('✅ 資料庫結構已重置', 'green');

		// 執行測試用戶初始化
		const initTestUsersPath = join(__dirname, '..', 'migrations', 'init_test_users.sql');
		if (existsSync(initTestUsersPath)) {
			log('👥 載入測試用戶...', 'yellow');
			const initTestUsersSql = await readFile(initTestUsersPath, 'utf-8');
			await client.query(initTestUsersSql);
			log('✅ 測試用戶已載入', 'green');
		} else {
			log('⚠️  找不到 migrations/init_test_users.sql，跳過', 'yellow');
		}

		// 執行 migrations
		log('🔧 執行資料庫遷移...', 'yellow');
		execSync('npm run db:migrate', { stdio: 'inherit' });

		log('✅ 資料庫重置完成！', 'green');
	} catch (error) {
		log(`❌ 重置資料庫時發生錯誤: ${error.message}`, 'red');
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

// 執行主程式
resetDatabase().catch((error) => {
	console.error(error);
	process.exit(1);
});
