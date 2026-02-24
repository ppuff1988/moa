#!/usr/bin/env node
import { join } from 'path';
import sharp from 'sharp';

const sizes = [
	{ size: 48, name: 'favicon.png', maskable: false },
	{ size: 192, name: 'pwa-icon-192.png', maskable: false },
	{ size: 512, name: 'pwa-icon-512.png', maskable: false },
	{ size: 192, name: 'pwa-icon-maskable-192.png', maskable: true },
	{ size: 512, name: 'pwa-icon-maskable-512.png', maskable: true }
];

async function generateIcons() {
	const sourcePath = join(process.cwd(), 'static', 'favicon.png');

	for (const { size, name, maskable } of sizes) {
		const outputPath = join(process.cwd(), 'static', name);

		if (maskable) {
			// Maskable icons need safe zone padding (20% on each side)
			const paddedSize = Math.round(size * 1.5);
			await sharp(sourcePath)
				.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
				.extend({
					top: Math.round((paddedSize - size) / 2),
					bottom: Math.round((paddedSize - size) / 2),
					left: Math.round((paddedSize - size) / 2),
					right: Math.round((paddedSize - size) / 2),
					background: { r: 0, g: 0, b: 0, alpha: 1 }
				})
				.resize(size, size)
				.toFile(outputPath);
		} else {
			await sharp(sourcePath)
				.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
				.toFile(outputPath);
		}

		console.log(`✅ Created ${name}`);
	}

	console.log('\n🎉 All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
