/**
 * Email Worker 郵件工作處理器
 * 從 pg-boss 隊列中取出郵件任務並發送
 */
import { getEmailQueue, EMAIL_QUEUE_NAME, type EmailJob } from './email-queue';
import { sendEmail } from './email';
import type PgBoss from 'pg-boss';

let isWorkerRunning = false;

/**
 * 郵件處理 Handler
 */
async function handleEmailJob(jobs: PgBoss.Job<EmailJob>[]): Promise<void> {
	for (const job of jobs) {
		const { to, subject, html, text } = job.data;

		console.log(`📮 處理郵件任務 [${job.id}]: 發送給 ${to}`);

		try {
			const success = await sendEmail({ to, subject, html, text });

			if (!success) {
				const error = new Error('郵件發送失敗');
				console.error(`❌ 郵件任務 [${job.id}] 處理失敗:`, error);
				throw error;
			}

			console.log(`✅ 郵件任務 [${job.id}] 處理成功`);
		} catch (error) {
			console.error(`❌ 郵件任務 [${job.id}] 處理失敗:`, error);
			throw error; // 重新拋出錯誤以觸發 pg-boss 的重試機制
		}
	}
}

/**
 * 啟動郵件 Worker
 */
export async function startEmailWorker(): Promise<void> {
	if (isWorkerRunning) {
		console.log('⚠️ 郵件 Worker 已經在運行中');
		return;
	}

	try {
		console.log('🚀 啟動郵件 Worker...');

		const queue = await getEmailQueue();

		// 註冊工作處理器
		await queue.work<EmailJob>(
			EMAIL_QUEUE_NAME,
			{
				batchSize: 5, // 一次處理的任務數量
				pollingIntervalSeconds: 5 // 輪詢間隔（秒）
			},
			handleEmailJob
		);

		isWorkerRunning = true;
		console.log('✅ 郵件 Worker 啟動成功');

		// 監聽錯誤事件
		queue.on('error', (error: Error) => {
			console.error('❌ 郵件 Worker 錯誤:', error);
		});
	} catch (error) {
		console.error('❌ 郵件 Worker 啟動失敗:', error);
		isWorkerRunning = false;
		throw error;
	}
}

/**
 * 停止郵件 Worker
 */
export async function stopEmailWorker(): Promise<void> {
	if (isWorkerRunning) {
		console.log('🛑 停止郵件 Worker...');
		// pg-boss 的 stop() 會自動停止所有 worker
		isWorkerRunning = false;
		console.log('✅ 郵件 Worker 已停止');
	}
}

/**
 * 檢查 Worker 是否正在運行
 */
export function isEmailWorkerRunning(): boolean {
	return isWorkerRunning;
}
