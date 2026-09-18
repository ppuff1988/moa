import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('room presence migration', () => {
	it('將既有 left_at 歷史資料回填為 left，並修正不完整的 left 狀態', () => {
		const migration = readFileSync(
			resolve(process.cwd(), 'migrations/0017_add_room_presence.sql'),
			'utf8'
		);

		expect(migration).toMatch(/SET room_presence\s*=\s*'left'[\s\S]*WHERE left_at IS NOT NULL/);
		expect(migration).toMatch(/SET left_at\s*=\s*NOW\(\)[\s\S]*WHERE room_presence\s*=\s*'left'/);
		expect(migration).toContain('game_players_room_presence_consistency_check');
	});
});
