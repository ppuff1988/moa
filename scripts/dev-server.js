import dotenvExpand from 'dotenv-expand';
import dotenvFlow from 'dotenv-flow';
import express from 'express';
import { createServer } from 'http';
import { createServer as createViteServer } from 'vite';

// 先加载環境變數量，再展开变量替换
const myEnv = dotenvFlow.config();
dotenvExpand.expand(myEnv);

// 调试：检查環境變數量
console.log('🔍 環境變數:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const app = express();
const server = createServer(app);

// 創建 Vite 服務器
const vite = await createViteServer({
	server: { middlewareMode: true },
	appType: 'custom'
});

// 使用 Vite 的中間件
app.use(vite.middlewares);

// 動態加載並初始化 Socket.IO
try {
	const socketModule = await vite.ssrLoadModule('/src/lib/server/socket.ts');

	if (socketModule.initSocketIO) {
		socketModule.initSocketIO(server);
		console.log('✅ Socket.IO 已成功初始化（開發模式）');
	} else {
		console.error('❌ 無法找到 initSocketIO 函數');
	}
} catch (error) {
	console.error('❌ Socket.IO 初始化失敗:', error);
}

const port = process.env.PORT || 5173;
const host = process.env.HOST || '0.0.0.0';

server.listen(port, host, () => {
	console.log(`🚀 開發服務器運行在:`);
	console.log(`   本機訪問: http://localhost:${port}`);
	console.log(`   網路訪問: http://${host}:${port}`);
	console.log('✅ Socket.IO 已啟用 (polling + websocket)');
	console.log(`💡 Socket.IO 端點: http://localhost:${port}/socket.io/`);
	console.log('💡 你可以開始開發了！');
});

// 熱重載時清理資源
if (import.meta.hot) {
	import.meta.hot.on('vite:beforeFullReload', async () => {
		const socketModule = await vite.ssrLoadModule('/src/lib/server/socket.ts');
		if (socketModule.closeSocketIO) {
			socketModule.closeSocketIO();
		}
	});
}
