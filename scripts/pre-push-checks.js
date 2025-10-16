import { execSync, spawn } from 'child_process';

const runCommand = (command, description) => {
	console.log(`\n${description}...`);
	try {
		execSync(command, { stdio: 'inherit' });
		return true;
	} catch {
		console.error(`❌ ${description} 失敗`);
		return false;
	}
};

const checkDockerContainer = (containerName) => {
	try {
		const result = execSync(
			`docker ps --filter "name=${containerName}" --filter "status=running" --format "{{.Names}}"`,
			{ encoding: 'utf8' }
		);
		return result.trim().includes(containerName);
	} catch {
		return false;
	}
};

const runAPITests = () => {
	return new Promise((resolve, reject) => {
		console.log('\n✅ 發現 PostgreSQL 容器正在運行，執行 API 測試...');

		const isWindows = process.platform === 'win32';
		const npmCommand = isWindows ? 'npm.cmd' : 'npm';

		const testProcess = spawn(npmCommand, ['run', 'test:api:auto'], {
			stdio: 'inherit',
			shell: isWindows,
			env: { ...process.env, NODE_ENV: 'test' }
		});

		testProcess.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error('API 測試失敗'));
		});
	});
};

const main = async () => {
	console.log('🔍 執行 pre-push 完整檢查...');

	// 建置檢查
	if (!runCommand('npm run build', '🏗️ 執行建置檢查')) process.exit(1);

	// API 測試
	if (checkDockerContainer('moa_postgres')) {
		try {
			await runAPITests();
		} catch (error) {
			console.error(error.message);
			process.exit(1);
		}
	} else {
		console.log('⚠️ PostgreSQL 容器未運行，跳過 API 測試');
		console.log("💡 提示：使用 'npm run db:start' 啟動資料庫後可執行完整測試");
	}

	// Docker build
	if (!runCommand('docker build -t moa/test .', '🏗️ 建置 Docker image')) process.exit(1);

	console.log('✅ Pre-push 檢查完成！');
};

main().catch((error) => {
	console.error('❌ Pre-push 檢查失敗:', error);
	process.exit(1);
});
