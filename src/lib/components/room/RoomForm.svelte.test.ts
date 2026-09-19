import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import { expect, it, vi } from 'vitest';

import RoomForm from './RoomForm.svelte';

it('keeps the room form scrollable so the cancel action remains reachable on short screens', async () => {
	await page.viewport(375, 667);
	const screen = render(RoomForm, { mode: 'create', onCancel: vi.fn() });
	const wrapper = screen.container.querySelector<HTMLElement>('.room-form-wrapper');

	expect(wrapper).not.toBeNull();
	expect(getComputedStyle(wrapper!).overflowY).toBe('auto');
	expect(getComputedStyle(wrapper!).maxHeight).not.toBe('none');
	expect(wrapper!.scrollHeight).toBeGreaterThan(wrapper!.clientHeight);
	await expect.element(screen.getByRole('button', { name: '取消' })).toBeVisible();
});

it('uses one consistent option card for seating and game settings', async () => {
	const screen = render(RoomForm, { mode: 'create', onCancel: vi.fn() });
	const optionCards = screen.container.querySelectorAll('.room-option-card');

	expect(optionCards).toHaveLength(4);
	expect(screen.container.querySelectorAll('.seating-options .room-option-card')).toHaveLength(2);
	await expect.element(screen.getByText('座位安排', { exact: true })).toBeVisible();
	expect(optionCards[0]).toHaveClass('active');
	await screen.getByRole('radio', { name: /依現場座位/ }).click();
	expect(optionCards[1]).toHaveClass('active');
});
