import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Socket role selection security', () => {
	const socketServers = ['src/lib/server/socket.ts', 'scripts/production-server.js'];

	it.each(socketServers)('%s 不得註冊可繞過 HTTP 驗證的 select-role mutation', (file) => {
		const source = readFileSync(resolve(process.cwd(), file), 'utf8');

		expect(source).not.toMatch(/socket\.on\(['"]select-role['"]/);
	});
});
