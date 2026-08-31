import { readdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function listFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = resolve(directory, entry.name);
		return entry.isDirectory() ? listFiles(path) : [path];
	});
}

describe('local API test runner', () => {
	it('uses a dedicated configurable port for both the server and API tests', () => {
		const source = readFileSync(resolve(process.cwd(), 'scripts/run-api-tests.js'), 'utf8');

		expect(source).toContain('const runtimeApiBaseUrl = process.env.API_BASE_URL;');
		expect(source).toContain(
			'const DEV_SERVER_PORT = Number(process.env.TEST_SERVER_PORT || 5174);'
		);
		expect(source).toContain(
			'const API_BASE_URL = runtimeApiBaseUrl || `http://localhost:${DEV_SERVER_PORT}`;'
		);
		expect(source.indexOf('const runtimeApiBaseUrl')).toBeLessThan(
			source.indexOf('dotenvFlow.config()')
		);
		expect(source).toContain('PORT: String(DEV_SERVER_PORT)');
		expect(source).toContain('API_BASE_URL');
	});

	it('does not hardcode localhost:5173 in API fetch calls', () => {
		const apiDirectory = resolve(process.cwd(), 'src/routes/api');
		const testFiles = listFiles(apiDirectory).filter(
			(path) => extname(path) === '.ts' && path.endsWith('.test.ts')
		);

		for (const path of testFiles) {
			const source = readFileSync(path, 'utf8');
			expect(source, path).not.toMatch(/fetch\(['"]http:\/\/localhost:5173/);
		}
	});

	it('does not print database credentials when the test server starts', () => {
		const source = readFileSync(resolve(process.cwd(), 'scripts/dev-server.js'), 'utf8');

		expect(source).not.toContain("console.log('DATABASE_URL:', process.env.DATABASE_URL)");
	});
});
