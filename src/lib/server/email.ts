/**
 * Email 郵件服務
 * 使用 nodemailer 發送郵件
 */
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

// 兼容 SvelteKit 和獨立 Node.js 環境
let env: Record<string, string | undefined>;
try {
	// 嘗試載入 SvelteKit 的 env
	const svelteEnv = await import('$env/dynamic/private');
	env = svelteEnv.env;
} catch {
	// 在獨立環境中使用 process.env
	env = process.env;
}

// 建立 SMTP transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (!transporter) {
		// Check if SMTP is configured
		if (!env.SMTP_HOST || !env.SMTP_USER) {
			// 在測試環境中，使用 mock transporter
			if (process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test') {
				console.log('📧 測試環境：使用 mock SMTP transporter');
				transporter = nodemailer.createTransport({
					host: 'localhost',
					port: 1025,
					secure: false,
					auth: undefined
				});
				return transporter;
			}
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
 * 郵件配置介面
 */
interface EmailConfig {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

/**
 * Email 模板共用樣式
 */
const emailStyles = `
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
	.action-button {
		display: inline-block;
		padding: 14px 40px;
		background-color: #A52422;
		color: #F5F1E8;
		text-decoration: none;
		border-radius: 6px;
		font-size: 16px;
		font-weight: 600;
	}
	.action-button:hover {
		background-color: #8B1E1C;
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
`;

/**
 * Email 驗證模板
 */
function getEmailVerificationTemplate(verificationLink: string): {
	html: string;
	text: string;
} {
	const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>驗證您的 Email</title>
	<style>${emailStyles}</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>歡迎加入古董局中局！</h1>
		</div>
		<div class="content">
			<p>您好，</p>
			<p>感謝您註冊古董局中局帳號！請點擊下方按鈕來驗證您的 Email 地址：</p>

			<div class="button-container">
				<a href="${verificationLink}" class="action-button">驗證 Email</a>
			</div>

			<div class="warning">
				<strong>重要提醒：</strong>
				<ul style="margin: 10px 0 0 0; padding-left: 20px;">
					<li>此驗證連結將在 <strong>24 小時</strong> 後失效</li>
					<li>驗證完成後即可開始使用所有功能</li>
					<li>如果您沒有註冊帳號，請忽略此郵件</li>
				</ul>
			</div>


			<p style="margin-top: 30px; font-size: 14px; color: #666;">
				如有任何問題，歡迎<a href="mailto:support@moa.sportify.tw">聯絡客服</a>
			</p>
		</div>
		<div class="footer">
			<p><strong>古董局中局非官方APP</strong></p>
			<p>此為系統自動發送的郵件，請勿直接回覆。</p>
		</div>
	</div>
</body>
</html>
	`;

	const text = `
驗證您的 Email

您好，

感謝您註冊古董局中局帳號！請使用以下連結來驗證您的 Email 地址：

${verificationLink}

重要提醒：
- 此驗證連結將在 24 小時後失效
- 驗證完成後即可開始使用所有功能
- 如果您沒有註冊帳號，請忽略此郵件

如有任何問題，歡迎聯繫我們的客服團隊。

古董局中局非官方APP
此為系統自動發送的郵件，請勿直接回覆。
	`;

	return { html, text };
}

/**
 * 密碼重置模板
 */
function getPasswordResetTemplate(resetLink: string): { html: string; text: string } {
	const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>重置密碼</title>
	<style>${emailStyles}</style>
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
				<a href="${resetLink}" class="action-button">重置密碼</a>
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
			<p><strong>古董局中局非官方APP</strong></p>
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

古董局中局非官方APP
此為系統自動發送的郵件，請勿直接回覆。
	`;

	return { html, text };
}

/**
 * 發送郵件
 */
export async function sendEmail(config: EmailConfig): Promise<boolean> {
	try {
		// 在測試環境中，不實際發送郵件
		if (process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test') {
			console.log('📧 測試環境：模擬發送郵件到', config.to);
			console.log('📧 主題:', config.subject);
			return true;
		}

		const transport = getTransporter();

		const info = await transport.sendMail({
			from: `"${env.SMTP_FROM_NAME || '古董局中局'}" <${env.SMTP_FROM_EMAIL || env.SMTP_USER}>`,
			to: config.to,
			subject: config.subject,
			text: config.text || '',
			html: config.html
		});

		console.log('✅ 郵件發送成功:', info.messageId);
		return true;
	} catch (error) {
		console.error('❌ 郵件發送失敗:', error);
		return false;
	}
}

/**
 * 生成郵件內容的輔助函數
 */
function generateEmailContent(
	templateType: 'passwordReset' | 'emailVerification',
	link: string
): { html: string; text: string } {
	if (templateType === 'passwordReset') {
		return getPasswordResetTemplate(link);
	} else {
		return getEmailVerificationTemplate(link);
	}
}

/**
 * 發送郵件的通用輔助函數（同步發送）
 */
async function sendTemplatedEmail(
	email: string,
	token: string,
	baseUrl: string,
	templateType: 'passwordReset' | 'emailVerification'
): Promise<boolean> {
	const link =
		templateType === 'passwordReset'
			? `${baseUrl}/auth/reset-password?token=${token}`
			: `${baseUrl}/api/auth/verify-email?token=${token}`;

	const subject =
		templateType === 'passwordReset' ? '重置您的密碼 - 古董局中局' : '驗證您的 Email - 古董局中局';

	const { html, text } = generateEmailContent(templateType, link);

	return sendEmail({ to: email, subject, html, text });
}

/**
 * 使用隊列發送郵件的通用輔助函數
 */
async function queueTemplatedEmail(
	email: string,
	token: string,
	baseUrl: string,
	templateType: 'passwordReset' | 'emailVerification'
): Promise<string | null> {
	const { queueEmail } = await import('./email-queue');

	const link =
		templateType === 'passwordReset'
			? `${baseUrl}/auth/reset-password?token=${token}`
			: `${baseUrl}/api/auth/verify-email?token=${token}`;

	const subject =
		templateType === 'passwordReset' ? '重置您的密碼 - 古董局中局' : '驗證您的 Email - 古董局中局';

	const { html, text } = generateEmailContent(templateType, link);

	return queueEmail({ to: email, subject, html, text });
}

/**
 * 發送密碼重置郵件
 */
export async function sendPasswordResetEmail(
	email: string,
	resetToken: string,
	baseUrl: string
): Promise<boolean> {
	return sendTemplatedEmail(email, resetToken, baseUrl, 'passwordReset');
}

/**
 * 使用隊列發送密碼重置郵件
 */
export async function queuePasswordResetEmail(
	email: string,
	resetToken: string,
	baseUrl: string
): Promise<string | null> {
	return queueTemplatedEmail(email, resetToken, baseUrl, 'passwordReset');
}

/**
 * 使用隊列發送 Email 驗證郵件
 */
export async function queueEmailVerification(
	email: string,
	verificationToken: string,
	baseUrl: string
): Promise<string | null> {
	return queueTemplatedEmail(email, verificationToken, baseUrl, 'emailVerification');
}
