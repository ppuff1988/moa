import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PWA branding', () => {
	it('公開 manifest 使用一致的中文網站名稱', async () => {
		const manifest = JSON.parse(
			await readFile(resolve(process.cwd(), 'static/manifest.json'), 'utf8')
		) as { name: string; short_name: string };

		expect(manifest.name).toBe('古董局中局');
		expect(manifest.short_name).toBe('古董局中局');
	});

	it('建置設定不包含舊版 PWA 品牌名稱', async () => {
		const viteConfig = await readFile(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

		expect(viteConfig).not.toContain('MOA - 末日危途');
		expect(viteConfig).toContain("name: '古董局中局'");
	});
});
