import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendPasswordResetEmail, sendEmail, queueEmailVerification } from '$lib/server/email';

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

// Mock email-queue
vi.mock('$lib/server/email-queue', () => ({
	queueEmail: vi.fn().mockResolvedValue('test-job-id')
}));

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		SMTP_HOST: 'smtp.test.com',
		SMTP_PORT: '587',
		SMTP_SECURE: 'false',
		SMTP_USER: 'test@test.com',
		SMTP_PASSWORD: 'test-password',
		SMTP_FROM_EMAIL: 'noreply@test.com',
		SMTP_FROM_NAME: 'Test App'
	}
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
	});

	describe('sendPasswordResetEmail', () => {
		it('應該生成正確的重置連結並發送', async () => {
			const email = 'user@example.com';
			const token = 'test-reset-token-123';
			const baseUrl = 'https://example.com';

			const result = await sendPasswordResetEmail(email, token, baseUrl);

			expect(result).toBe(true);
		});
	});

	describe('queueEmailVerification', () => {
		it('應該將驗證郵件加入隊列', async () => {
			const email = 'user@example.com';
			const token = 'test-verification-token';
			const baseUrl = 'https://example.com';

			const result = await queueEmailVerification(email, token, baseUrl);

			expect(result).toBe('test-job-id');
		});
	});
});
