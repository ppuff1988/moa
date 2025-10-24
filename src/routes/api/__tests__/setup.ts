import { beforeAll, afterAll } from 'vitest';
import dotenvFlow from 'dotenv-flow';
import dotenvExpand from 'dotenv-expand';

// 先加载环境变量，再展开变量替换
const myEnv = dotenvFlow.config();
dotenvExpand.expand(myEnv);

// 測試設置文件
// 在所有測試運行前執行的全局設置

beforeAll(async () => {
	console.log('🧪 開始 API 測試...');
	console.log('📝 請確保開發服務器正在運行：npm run dev');
	console.log('🗄️ 請確保數據庫正在運行：npm run db:start');

	// 等待服務器啟動
	await new Promise((resolve) => setTimeout(resolve, 2000));
});

afterAll(async () => {
	console.log('✅ API 測試完成');
});
