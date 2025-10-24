import dotenvFlow from 'dotenv-flow';
import dotenvExpand from 'dotenv-expand';
import { spawn } from 'child_process';

// 先加载環境變數量，再展开变量替换
const myEnv = dotenvFlow.config();
dotenvExpand.expand(myEnv);

const DEV_SERVER_PORT = 5173;
const API_BASE_URL = `http://localhost:${DEV_SERVER_PORT}`;
const MAX_WAIT_TIME = 60000; // 60秒
const CHECK_INTERVAL = 1000; // 每秒檢查一次

let devServerProcess = null;

// 檢查伺服器是否就緒
async function checkServerReady() {
	try {
		const response = await fetch(API_BASE_URL);
		return response.ok || response.status === 404; // 只要伺服器回應就算就緒
	} catch {
		return false;
	}
}

// 等待伺服器啟動
async function waitForServer() {
	const startTime = Date.now();
	console.log('⏳ 等待開發伺服器啟動...');

	while (Date.now() - startTime < MAX_WAIT_TIME) {
		if (await checkServerReady()) {
			console.log('✅ 開發伺服器已就緒');
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
	}

	console.error('❌ 等待伺服器超時');
	return false;
}

// 啟動開發伺服器
function startDevServer() {
	return new Promise((resolve, reject) => {
		console.log('🚀 啟動開發伺服器...');

		// Windows 使用 npm.cmd
		const isWindows = process.platform === 'win32';
		const npmCommand = isWindows ? 'npm.cmd' : 'npm';

		devServerProcess = spawn(npmCommand, ['run', 'dev'], {
			stdio: 'pipe',
			shell: isWindows,
			env: {
				...process.env,
				NODE_ENV: 'test'
			}
		});

		devServerProcess.stdout.on('data', (data) => {
			console.log(`[開發伺服器] ${data.toString().trim()}`);
		});

		devServerProcess.stderr.on('data', (data) => {
			console.error(`[開發伺服器錯誤] ${data.toString().trim()}`);
		});

		devServerProcess.on('error', (error) => {
			console.error('❌ 啟動開發伺服器失敗:', error);
			reject(error);
		});

		// 給伺服器一些時間啟動
		setTimeout(resolve, 3000);
	});
}

// 執行測試
function runTests() {
	return new Promise((resolve, reject) => {
		console.log('\n🧪 開始執行 API 測試...\n');

		const isWindows = process.platform === 'win32';
		const npmCommand = isWindows ? 'npm.cmd' : 'npm';

		const testProcess = spawn(npmCommand, ['run', 'test:api'], {
			stdio: 'inherit',
			shell: isWindows
		});

		testProcess.on('close', (code) => {
			if (code === 0) {
				console.log('\n✅ API 測試完成');
				resolve();
			} else {
				console.error(`\n❌ API 測試失敗，退出碼: ${code}`);
				reject(new Error(`測試失敗，退出碼: ${code}`));
			}
		});

		testProcess.on('error', (error) => {
			console.error('❌ 執行測試失敗:', error);
			reject(error);
		});
	});
}

// 停止開發伺服器
function stopDevServer() {
	if (devServerProcess) {
		console.log('\n🛑 停止開發伺服器...');

		if (process.platform === 'win32') {
			// Windows 需要使用 taskkill 來終止處理程序樹
			spawn('taskkill', ['/pid', devServerProcess.pid, '/f', '/t']);
		} else {
			devServerProcess.kill('SIGTERM');
		}

		devServerProcess = null;
	}
}

// 主函式
async function main() {
	let exitCode = 0;

	try {
		// 1. 啟動開發伺服器
		await startDevServer();

		// 2. 等待伺服器就緒
		const serverReady = await waitForServer();
		if (!serverReady) {
			throw new Error('開發伺服器啟動超時');
		}

		// 3. 執行測試
		await runTests();
	} catch (error) {
		console.error('\n❌ 錯誤:', error.message);
		exitCode = 1;
	} finally {
		// 4. 清理：停止開發伺服器
		stopDevServer();

		// 給一點時間讓處理程序完全關閉
		await new Promise((resolve) => setTimeout(resolve, 1000));

		process.exit(exitCode);
	}
}

// 處理中斷訊號
process.on('SIGINT', () => {
	console.log('\n\n⚠️  收到中斷訊號...');
	stopDevServer();
	process.exit(130);
});

process.on('SIGTERM', () => {
	console.log('\n\n⚠️  收到終止訊號...');
	stopDevServer();
	process.exit(143);
});

// 執行主函式
main();
