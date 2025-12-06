/**
 * Email Queue Worker 啟動腳本
 * 這是一個獨立的進程，用於處理郵件隊列
 *
 * 使用方式：
 * npm run worker:email
 */
import { startEmailWorker } from '../src/lib/server/email-worker';
import { getQueueStatus } from '../src/lib/server/email-queue';
import dotenvFlow from 'dotenv-flow';

// 使用 dotenv-flow 載入環境變數
dotenvFlow.config({
	node_env: process.env.NODE_ENV || 'development',
	default_node_env: 'development',
	path: process.cwd()
});

console.log('📬 郵件隊列 Worker');
console.log('=====================================');
console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
console.log(`資料庫: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || '未配置'}`);
console.log('=====================================\n');

// 啟動 Worker
async function main() {
	try {
		await startEmailWorker();

		console.log('\n✅ Worker 已啟動，正在監聽郵件隊列...\n');

		// 每 30 秒顯示一次隊列狀態
		setInterval(async () => {
			try {
				const status = await getQueueStatus();
				if (status) {
					console.log('📊 隊列狀態:', {
						待處理: status.created,
						處理中: status.active,
						已完成: status.completed,
						失敗: status.failed,
						總計: status.total
					});
				}
			} catch (error) {
				console.error('獲取狀態時出錯:', error);
			}
		}, 30000);

		// 保持進程運行
		process.stdin.resume();
	} catch (error) {
		console.error('❌ Worker 啟動失敗:', error);
		process.exit(1);
	}
}

// 優雅關閉
process.on('SIGTERM', async () => {
	console.log('\n🛑 收到 SIGTERM 信號，正在關閉...');
	process.exit(0);
});

process.on('SIGINT', async () => {
	console.log('\n🛑 收到 SIGINT 信號，正在關閉...');
	process.exit(0);
});

// 啟動
main();
