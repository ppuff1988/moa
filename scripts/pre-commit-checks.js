import { execSync } from 'child_process';

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

console.log('🔍 執行 pre-commit 快速檢查...');

// lint-staged
if (!runCommand('npm run lint-staged', '📝 執行 lint-staged')) process.exit(1);

// 類型檢查
if (!runCommand('npm run check', '🔧 執行類型檢查')) process.exit(1);

console.log('✅ Pre-commit 快速檢查完成！');
