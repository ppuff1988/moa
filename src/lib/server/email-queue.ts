/**
 * Email Queue 郵件隊列服務
 * 使用 pg-boss 管理郵件發送隊列
 */
import PgBoss from 'pg-boss';

// 郵件工作類型
export const EMAIL_QUEUE_NAME = 'send-email';

// 郵件任務資料結構
export interface EmailJob {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

let boss: PgBoss | null = null;
let isStarting = false;
let isStopped = false;

/**
 * 手動處理環境變數替換
 */
function resolveEnvironmentVariables(str: string | undefined): string {
	if (!str) return '';
	return str.replace(/\$\{([^}]+)}/g, (match, varName) => {
		return process.env[varName] || match;
	});
}

/**
 * 獲取 pg-boss 實例
 */
export async function getEmailQueue(): Promise<PgBoss> {
	if (boss && !isStopped) {
		return boss;
	}

	// 防止重複初始化
	if (isStarting) {
		// 等待初始化完成
		while (isStarting) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		if (boss && !isStopped) {
			return boss;
		}
	}

	isStarting = true;
	isStopped = false;

	try {
		const databaseUrl = resolveEnvironmentVariables(process.env.DATABASE_URL);

		if (!databaseUrl || databaseUrl.includes('dummy')) {
			isStarting = false;
			throw new Error('DATABASE_URL 未正確配置');
		}

		console.log('📬 初始化郵件隊列服務 (pg-boss)...');

		boss = new PgBoss({
			connectionString: databaseUrl,
			// 監控選項
			monitorIntervalSeconds: 60
		});

		// 創建預設隊列配置
		await boss.start();

		// 配置郵件隊列選項
		await boss.createQueue(EMAIL_QUEUE_NAME, {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true,
			expireInSeconds: 3600, // 1小時
			retentionSeconds: 86400 // 保留 24小時
		});

		console.log('✅ 郵件隊列服務啟動成功');

		// 處理進程退出時的清理
		const cleanup = async () => {
			if (boss && !isStopped) {
				console.log('🛑 正在停止郵件隊列服務...');
				isStopped = true;
				await boss.stop({ timeout: 30000 });
				console.log('✅ 郵件隊列服務已停止');
			}
		};

		process.on('SIGTERM', cleanup);
		process.on('SIGINT', cleanup);
		process.on('beforeExit', cleanup);

		return boss;
	} catch (error) {
		console.error('❌ 郵件隊列服務初始化失敗:', error);
		isStarting = false;
		throw error;
	} finally {
		isStarting = false;
	}
}

/**
 * 將郵件加入隊列
 */
export async function queueEmail(emailData: EmailJob): Promise<string | null> {
	try {
		// 在測試環境中，不使用隊列
		if (process.env.NODE_ENV === 'test') {
			console.log('📧 測試環境：模擬將郵件加入隊列', emailData.to);
			return 'test-job-id';
		}

		const queue = await getEmailQueue();
		const jobId = await queue.send(EMAIL_QUEUE_NAME, emailData, {
			retryLimit: 3,
			retryDelay: 60,
			retryBackoff: true
		});

		console.log('✅ 郵件已加入隊列:', jobId, '收件者:', emailData.to);
		return jobId;
	} catch (error) {
		console.error('❌ 郵件加入隊列失敗:', error);
		return null;
	}
}

/**
 * 批量將郵件加入隊列
 */
export async function queueEmailBatch(emails: EmailJob[]): Promise<void> {
	try {
		const queue = await getEmailQueue();

		const jobs = emails.map((email) => ({
			name: EMAIL_QUEUE_NAME,
			data: email
		}));

		await queue.insert(EMAIL_QUEUE_NAME, jobs);
		console.log(`✅ ${emails.length} 封郵件已批量加入隊列`);
	} catch (error) {
		console.error('❌ 批量郵件加入隊列失敗:', error);
		throw error;
	}
}

/**
 * 獲取隊列狀態
 */
export async function getQueueStatus() {
	try {
		const queue = await getEmailQueue();
		const stats = await queue.getQueueStats(EMAIL_QUEUE_NAME);

		return {
			created: stats.queuedCount || 0,
			active: stats.activeCount || 0,
			completed: 0, // pg-boss 不直接提供此數據
			failed: 0, // pg-boss 不直接提供此數據
			total: stats.totalCount || 0
		};
	} catch (error) {
		console.error('❌ 獲取隊列狀態失敗:', error);
		return null;
	}
}

/**
 * 清除失敗的任務
 */
export async function clearFailedJobs(): Promise<number> {
	try {
		const queue = await getEmailQueue();
		// 刪除隊列中的任務
		await queue.deleteQueuedJobs(EMAIL_QUEUE_NAME);
		console.log(`✅ 已清除隊列中的任務`);
		return 1;
	} catch (error) {
		console.error('❌ 清除失敗任務時出錯:', error);
		return 0;
	}
}

/**
 * 停止郵件隊列服務
 */
export async function stopEmailQueue(): Promise<void> {
	if (boss && !isStopped) {
		isStopped = true;
		await boss.stop({ timeout: 30000 });
		boss = null;
		console.log('✅ 郵件隊列服務已停止');
	}
}
