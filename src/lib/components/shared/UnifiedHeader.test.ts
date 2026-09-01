import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import UnifiedHeader from './UnifiedHeader.svelte';

describe('UnifiedHeader game identity', () => {
	it('groups each player name with their role and chip color', () => {
		const { body } = render(UnifiedHeader, {
			props: {
				roomName: '404263',
				gameStatus: 'playing',
				currentUserNickname: '木戶加奈',
				currentPlayerRole: '老朝奉',
				currentPlayerColor: '黃',
				currentPlayerColorCode: '#EAB308',
				teammateInfo: {
					roleName: '藥不然',
					nickname: '老朝奉',
					colorCode: '#A855F7'
				}
			} as never
		});

		expect(body).toContain('aria-label="你的身分"');
		expect(body).toContain('aria-label="隊友身分"');
		expect(body).toContain('木戶加奈');
		expect(body).toContain('角色 · 老朝奉');
		expect(body).toContain('黃色');
		expect(body).toContain('老朝奉');
		expect(body).toContain('角色 · 藥不然');
		expect(body).toContain('紫色');
		expect(body).toContain('class="identity-card');
		expect(body).toContain('同隊');
	});
});
