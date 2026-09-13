import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('測試帳號資料標記', () => {
	it('初始化 fixture 時直接標記 is_test', () => {
		const sql = readFileSync(resolve(process.cwd(), 'migrations/init_test_users.sql'), 'utf8');

		expect(sql).toContain(
			'INSERT INTO users (email, nickname, password_hash, email_verified, is_test) VALUES'
		);
		expect(sql.match(/, true, true\)/g)).toHaveLength(8);
	});

	it('legacy backfill 只用 escaped nickname 與測試信箱共同判斷', () => {
		const sql = readFileSync(
			resolve(process.cwd(), 'migrations/0016_mark_legacy_test_users.sql'),
			'utf8'
		);

		expect(sql).toContain("nickname LIKE '測試\\_%' ESCAPE '\\'");
		expect(sql).toContain("AND email LIKE '%@test.com'");
		expect(sql).not.toContain("WHERE nickname LIKE '測試_%'");
	});
});
