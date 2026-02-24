import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, '../static');

async function generatePlaceholderScreenshots() {
	try {
		console.log('📸 生成桌面截圖佔位符...');
		await sharp({
			create: {
				width: 1920,
				height: 1080,
				channels: 3,
				background: { r: 0, g: 0, b: 0 }
			}
		})
			.png()
			.toFile(path.join(staticDir, 'screenshot-desktop.png'));
		console.log('✓ 桌面截圖佔位符已保存: screenshot-desktop.png (1920x1080)');

		console.log('📱 生成手機截圖佔位符...');
		await sharp({
			create: {
				width: 390,
				height: 844,
				channels: 3,
				background: { r: 0, g: 0, b: 0 }
			}
		})
			.png()
			.toFile(path.join(staticDir, 'screenshot-mobile.png'));
		console.log('✓ 手機截圖佔位符已保存: screenshot-mobile.png (390x844)');

		console.log('\n✅ PWA 截圖佔位符生成完成！');
		console.log('💡 提示：這些是黑色的佔位符圖片。建議稍後用實際截圖替換。');
	} catch (error) {
		console.error('❌ 錯誤:', error);
		process.exit(1);
	}
}

generatePlaceholderScreenshots();
