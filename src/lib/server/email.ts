/**
 * Email 郵件服務
 * 使用 nodemailer 發送郵件
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '$env/dynamic/private';

// 建立 SMTP transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (!transporter) {
		// Check if SMTP is configured
		if (!env.SMTP_HOST || !env.SMTP_USER) {
			throw new Error(
				'SMTP configuration is not set. Please configure SMTP environment variables.'
			);
		}

		const config = {
			host: env.SMTP_HOST,
			port: parseInt(env.SMTP_PORT || '587'),
			secure: env.SMTP_SECURE === 'true', // true for 465, false for other ports
			auth: {
				user: env.SMTP_USER,
				pass: env.SMTP_PASSWORD || ''
			}
		};

		console.log('📧 初始化 SMTP 連線:', {
			host: config.host,
			port: config.port,
			secure: config.secure,
			user: config.auth.user
		});

		transporter = nodemailer.createTransport(config);
	}

	return transporter;
}

/**
 * 發送郵件
 */
export async function sendEmail({
	to,
	subject,
	html,
	text
}: {
	to: string;
	subject: string;
	html: string;
	text?: string;
}): Promise<boolean> {
	try {
		const transport = getTransporter();

		const info = await transport.sendMail({
			from: `"${env.SMTP_FROM_NAME || '古董局中局'}" <${env.SMTP_FROM_EMAIL || env.SMTP_USER}>`,
			to,
			subject,
			text: text || '',
			html
		});

		console.log('✅ 郵件發送成功:', info.messageId);
		return true;
	} catch (error) {
		console.error('❌ 郵件發送失敗:', error);
		return false;
	}
}

/**
 * 發送密碼重置郵件
 */
export async function sendPasswordResetEmail(
	email: string,
	resetToken: string,
	baseUrl: string
): Promise<boolean> {
	const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

	const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>重置密碼</title>
	<style>
		body {
			font-family: 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif;
			line-height: 1.6;
			color: #4a3f35;
			background-color: #f5f5f5;
			margin: 0;
			padding: 0;
		}
		.container {
			max-width: 600px;
			margin: 40px auto;
			background-color: #E8D9C5;
			border-radius: 8px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
			overflow: hidden;
			border: 1px solid #7A6E5E;
		}
		.header {
			background-color: #A52422;
			color: #F5F1E8;
			padding: 30px 40px;
			text-align: center;
			border-bottom: 2px solid #C6A664;
		}
		.header h1 {
			margin: 0;
			font-size: 24px;
			font-weight: 600;
		}
		.content {
			padding: 40px;
			background-color: #E8D9C5;
		}
		.content p {
			margin: 0 0 20px 0;
			font-size: 16px;
			color: #4a3f35;
		}
		.button-container {
			text-align: center;
			margin: 30px 0;
		}
		.reset-button {
			display: inline-block;
			padding: 14px 40px;
			background-color: #A52422;
			color: #F5F1E8;
			text-decoration: none;
			border-radius: 6px;
			font-size: 16px;
			font-weight: 600;
		}
		.reset-button:hover {
			background-color: #8B1E1C;
		}
		.divider {
			border-top: 2px solid #C6A664;
			margin: 30px 0;
		}
		.link-section {
			background-color: #F5F1E8;
			padding: 20px;
			border-radius: 6px;
			margin: 20px 0;
			border: 1px solid #7A6E5E;
		}
		.link-section p {
			margin: 0 0 10px 0;
			font-size: 14px;
			color: #4a3f35;
		}
		.link-text {
			word-break: break-all;
			color: #A52422;
			font-size: 13px;
		}
		.warning {
			background-color: #F5F1E8;
			border-left: 4px solid #C6A664;
			padding: 15px;
			margin: 20px 0;
			font-size: 14px;
			color: #4a3f35;
			border-radius: 4px;
		}
		.footer {
			background-color: #7A6E5E;
			padding: 20px 40px;
			text-align: center;
			font-size: 13px;
			color: #F5F1E8;
			border-top: 2px solid #C6A664;
		}
		.footer p {
			margin: 5px 0;
		}
		@media only screen and (max-width: 600px) {
			.container {
				margin: 20px;
			}
			.header, .content, .footer {
				padding: 20px;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>重置密碼</h1>
		</div>
		<div class="content">
			<p>您好，</p>
			<p>我們收到了您的密碼重置請求。請點擊下方按鈕來重置您的密碼：</p>
			
			<div class="button-container">
				<a href="${resetLink}" class="reset-button">重置密碼</a>
			</div>

			<div class="warning">
				<strong>重要提醒：</strong>
				<ul style="margin: 10px 0 0 0; padding-left: 20px;">
					<li>此連結將在 <strong>1 小時</strong> 後失效</li>
					<li>如果您沒有請求重置密碼，請忽略此郵件</li>
					<li>為了您的帳號安全，請勿將此連結分享給他人</li>
				</ul>
			</div>

			<p style="margin-top: 30px; font-size: 14px; color: #666;">
				如有任何問題，歡迎<a href="mailto:support@moa.sportify.tw">聯絡客服</a>
			</p>
		</div>
		<div class="footer">
			<p><strong>古董局中局 - MOA</strong></p>
			<p>此為系統自動發送的郵件，請勿直接回覆。</p>
		</div>
	</div>
</body>
</html>
	`;

	const text = `
重置密碼

您好，

我們收到了您的密碼重置請求。請使用以下連結來重置您的密碼：

${resetLink}

重要提醒：
- 此連結將在 1 小時後失效
- 如果您沒有請求重置密碼，請忽略此郵件
- 為了您的帳號安全，請勿將此連結分享給他人

如有任何問題，歡迎聯繫我們的客服團隊。

古董局中局 - MOA
此為系統自動發送的郵件，請勿直接回覆。
	`;

	return sendEmail({
		to: email,
		subject: '重置您的密碼 - 古董局中局',
		html,
		text
	});
}
