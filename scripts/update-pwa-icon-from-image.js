#!/usr/bin/env node
import sharp from 'sharp';
import { join } from 'path';

const sizes = [
	{ size: 48, name: 'favicon.png', maskable: false },
	{ size: 192, name: 'pwa-icon-192.png', maskable: false },
	{ size: 512, name: 'pwa-icon-512.png', maskable: false },
	{ size: 192, name: 'pwa-icon-maskable-192.png', maskable: true },
	{ size: 512, name: 'pwa-icon-maskable-512.png', maskable: true }
];

async function processImage(inputPath, outputDir) {
	console.log(`📥 處理圖片: ${inputPath}`);

	for (const { size, name, maskable } of sizes) {
		const outputPath = join(outputDir, name);

		if (maskable) {
			// Maskable icons need safe zone padding (20% on each side)
			// 內容應該在中間 80% 的區域內
			const safeZoneSize = Math.round(size * 0.8);
			const padding = Math.round((size - safeZoneSize) / 2);

			await sharp(inputPath)
				.resize(safeZoneSize, safeZoneSize, {
					fit: 'contain',
					background: { r: 0, g: 0, b: 0, alpha: 1 }
				})
				.extend({
					top: padding,
					bottom: padding,
					left: padding,
					right: padding,
					background: { r: 0, g: 0, b: 0, alpha: 1 }
				})
				.toFile(outputPath);
		} else {
			await sharp(inputPath)
				.resize(size, size, {
					fit: 'contain',
					background: { r: 0, g: 0, b: 0, alpha: 0 }
				})
				.toFile(outputPath);
		}

		console.log(`✅ Created ${name} (${size}x${size}${maskable ? ', maskable' : ''})`);
	}

	console.log('\n🎉 所有 PWA 圖標已成功生成！');
}

const inputPath = process.argv[2] || join(process.cwd(), 'static', 'app-icon-source.png');
const outputDir = join(process.cwd(), 'static');

processImage(inputPath, outputDir).catch(console.error);
