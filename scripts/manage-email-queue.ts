/**
 * Email Queue 管理工具
 * 用於管理和監控郵件隊列
 *
 * 使用方式：
 * node scripts/manage-email-queue.js status      - 查看隊列狀態
 * node scripts/manage-email-queue.js clear       - 清除失敗的任務
 * node scripts/manage-email-queue.js test        - 發送測試郵件
 */
import {
	getQueueStatus,
	clearFailedJobs,
	queueEmail,
	stopEmailQueue
} from '../src/lib/server/email-queue';
import dotenvFlow from 'dotenv-flow';

// 載入環境變數
dotenvFlow.config({
	node_env: process.env.NODE_ENV || 'development',
	default_node_env: 'development',
	path: process.cwd()
});

const command = process.argv[2];

async function showStatus() {
	console.log('📊 正在獲取隊列狀態...\n');

	try {
		const status = await getQueueStatus();

		if (!status) {
			console.error('❌ 無法獲取隊列狀態');
			return;
		}

		console.log('✅ 郵件隊列狀態:');
		console.log('=====================================');
		console.log(`待處理任務: ${status.created}`);
		console.log(`處理中任務: ${status.active}`);
		console.log(`已完成任務: ${status.completed}`);
		console.log(`失敗任務:   ${status.failed}`);
		console.log(`總計任務:   ${status.total}`);
		console.log('=====================================\n');
	} catch (error) {
		console.error('❌ 獲取狀態時出錯:', error);
	}
}

async function clearFailed() {
	console.log('🧹 正在清除失敗的任務...\n');

	try {
		const count = await clearFailedJobs();
		console.log(`✅ 已清除 ${count} 個失敗的任務\n`);
	} catch (error) {
		console.error('❌ 清除失敗任務時出錯:', error);
	}
}

async function sendTestEmail() {
	console.log('📧 正在發送測試郵件...\n');

	const testEmail = process.argv[3] || 'test@example.com';

	try {
		const jobId = await queueEmail({
			to: testEmail,
			subject: '測試郵件 - 古董局中局',
			html: `
				<h1>測試郵件</h1>
				<p>這是一封來自古董局中局郵件隊列系統的測試郵件。</p>
				<p>發送時間: ${new Date().toLocaleString('zh-TW')}</p>
			`,
			text: `測試郵件\n\n這是一封來自古董局中局郵件隊列系統的測試郵件。\n\n發送時間: ${new Date().toLocaleString('zh-TW')}`
		});

		if (jobId) {
			console.log(`✅ 測試郵件已加入隊列`);
			console.log(`任務 ID: ${jobId}`);
			console.log(`收件者: ${testEmail}\n`);
		} else {
			console.error('❌ 測試郵件加入隊列失敗\n');
		}
	} catch (error) {
		console.error('❌ 發送測試郵件時出錯:', error);
	}
}

async function showHelp() {
	console.log('📬 郵件隊列管理工具');
	console.log('=====================================');
	console.log('使用方式:');
	console.log('  node scripts/manage-email-queue.js status              - 查看隊列狀態');
	console.log('  node scripts/manage-email-queue.js clear               - 清除失敗的任務');
	console.log('  node scripts/manage-email-queue.js test [email]        - 發送測試郵件');
	console.log('  node scripts/manage-email-queue.js help                - 顯示幫助');
	console.log('=====================================\n');
}

async function main() {
	try {
		switch (command) {
			case 'status':
				await showStatus();
				break;
			case 'clear':
				await clearFailed();
				break;
			case 'test':
				await sendTestEmail();
				break;
			case 'help':
			default:
				await showHelp();
				break;
		}
	} catch (error) {
		console.error('❌ 執行命令時出錯:', error);
	} finally {
		await stopEmailQueue();
		process.exit(0);
	}
}

main();
