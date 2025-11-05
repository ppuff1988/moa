import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendPasswordResetEmail, sendEmail } from '$lib/server/email';

// Mock nodemailer
vi.mock('nodemailer', () => {
	const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'test-message-id' });
	return {
		default: {
			createTransport: vi.fn(() => ({
				sendMail: sendMailMock
			}))
		}
	};
});

// Mock environment variables
vi.mock('$env/static/private', () => ({
	SMTP_HOST: 'smtp.test.com',
	SMTP_PORT: '587',
	SMTP_SECURE: 'false',
	SMTP_USER: 'test@test.com',
	SMTP_PASSWORD: 'test-password',
	SMTP_FROM_EMAIL: 'noreply@test.com',
	SMTP_FROM_NAME: 'Test App'
}));

describe('Email Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('sendEmail', () => {
		it('應該成功發送郵件', async () => {
			const result = await sendEmail({
				to: 'user@example.com',
				subject: 'Test Email',
				html: '<p>Test content</p>',
				text: 'Test content'
			});

			expect(result).toBe(true);
		});

		it('應該處理發送失敗的情況', async () => {
			const nodemailer = await import('nodemailer');
			const transportMock = nodemailer.default.createTransport({});
			vi.spyOn(transportMock, 'sendMail').mockRejectedValueOnce(new Error('Send failed'));

			const result = await sendEmail({
				to: 'user@example.com',
				subject: 'Test Email',
				html: '<p>Test content</p>'
			});

			// 因為錯誤被捕獲，應該返回 false
			expect(result).toBe(false);
		});
	});

	describe('sendPasswordResetEmail', () => {
		it('應該生成正確的重置連結', async () => {
			const email = 'user@example.com';
			const token = 'test-reset-token-123';
			const baseUrl = 'https://example.com';

			const result = await sendPasswordResetEmail(email, token, baseUrl);

			expect(result).toBe(true);
		});

		it('應該包含正確的郵件內容', async () => {
			const nodemailer = await import('nodemailer');
			const transportMock = nodemailer.default.createTransport({});
			const sendMailSpy = vi.spyOn(transportMock, 'sendMail');

			const email = 'user@example.com';
			const token = 'test-token';
			const baseUrl = 'https://test.com';

			await sendPasswordResetEmail(email, token, baseUrl);

			expect(sendMailSpy).toHaveBeenCalled();
			const callArgs = sendMailSpy.mock.calls[0][0];

			expect(callArgs.to).toBe(email);
			expect(callArgs.subject).toContain('重置');
			expect(callArgs.html).toContain(token);
			expect(callArgs.html).toContain(baseUrl);
		});
	});
});
