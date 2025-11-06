import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { generateUserJWT } from '$lib/server/auth';

/**
 * 響應頁面共用樣式
 */
const pageStyles = `
	body {
		font-family: 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif;
		background-color: #f5f5f5;
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		margin: 0;
		padding: 20px;
	}
	.container {
		background-color: #E8D9C5;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #7A6E5E;
		padding: 40px;
		max-width: 500px;
		text-align: center;
	}
	.icon {
		font-size: 64px;
		margin-bottom: 20px;
	}
	h1 {
		margin: 0 0 20px 0;
		font-size: 24px;
	}
	p {
		color: #4a3f35;
		line-height: 1.6;
		margin: 0 0 20px 0;
	}
	.button {
		display: inline-block;
		padding: 12px 30px;
		background-color: #A52422;
		color: #F5F1E8;
		text-decoration: none;
		border-radius: 6px;
		font-size: 16px;
		font-weight: 600;
		margin-top: 20px;
	}
	.button:hover {
		background-color: #8B1E1C;
	}
	.loading {
		margin-top: 20px;
		color: #7A6E5E;
		font-size: 14px;
	}
	.success-title {
		color: #22C55E;
	}
	.error-title {
		color: #A52422;
	}
`;

/**
 * 生成響應頁面
 */
function generateResponsePage(config: {
	title: string;
	icon: string;
	heading: string;
	headingClass: 'success-title' | 'error-title';
	messages: string[];
	buttonText?: string;
	buttonLink?: string;
	script?: string;
}): Response {
	const buttonHtml =
		config.buttonText && config.buttonLink
			? `<a href="${config.buttonLink}" class="button">${config.buttonText}</a>`
			: '';

	const scriptTag = config.script ? `<script>${config.script}</script>` : '';

	const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${config.title}</title>
	<style>${pageStyles}</style>
	${scriptTag}
</head>
<body>
	<div class="container">
		<div class="icon">${config.icon}</div>
		<h1 class="${config.headingClass}">${config.heading}</h1>
		${config.messages.map((msg) => `<p>${msg}</p>`).join('\n\t\t')}
		${buttonHtml}
	</div>
</body>
</html>
	`;

	return new Response(html, {
		status: config.headingClass === 'error-title' ? 400 : 200,
		headers: {
			'Content-Type': 'text/html; charset=utf-8'
		}
	});
}

/**
 * GET /api/auth/verify-email?token=xxx
 * 驗證用戶的 Email 地址
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const token = url.searchParams.get('token');

		if (!token) {
			return json({ message: '缺少驗證 token' }, { status: 400 });
		}

		// 查詢具有此 token 且尚未過期的用戶
		const now = new Date();
		const foundUsers = await db
			.select()
			.from(user)
			.where(
				and(eq(user.emailVerificationToken, token), gt(user.emailVerificationTokenExpiresAt, now))
			)
			.limit(1);

		if (foundUsers.length === 0) {
			// Token 無效或已過期
			return generateResponsePage({
				title: '驗證失敗 - 古董局中局',
				icon: '❌',
				heading: '驗證連結無效或已過期',
				headingClass: 'error-title',
				messages: [
					'此驗證連結可能已經失效或已被使用。',
					'如需重新發送驗證郵件，請聯繫客服或重新註冊。'
				],
				buttonText: '返回登入頁面',
				buttonLink: '/auth/login'
			});
		}

		const userData = foundUsers[0];

		// 如果已經驗證過，直接重定向
		if (userData.emailVerified) {
			return generateResponsePage({
				title: '已驗證 - 古董局中局',
				icon: '✅',
				heading: 'Email 已驗證',
				headingClass: 'success-title',
				messages: ['您的 Email 已經通過驗證，可以直接登入使用。'],
				buttonText: '前往登入',
				buttonLink: '/auth/login'
			});
		}

		// 更新用戶為已驗證，並清除驗證 token
		await db
			.update(user)
			.set({
				emailVerified: true,
				emailVerificationToken: null,
				emailVerificationTokenExpiresAt: null
			})
			.where(eq(user.id, userData.id));

		console.log('✅ Email 驗證成功:', userData.email);

		// 生成 JWT token 並自動登入用戶
		const jwtToken = generateUserJWT({ id: userData.id, email: userData.email });

		// 返回成功頁面，並自動設定 token 和重定向
		return generateResponsePage({
			title: '驗證成功 - 古董局中局',
			icon: '✅',
			heading: 'Email 驗證成功！',
			headingClass: 'success-title',
			messages: [
				'恭喜您，您的帳號已經啟用。',
				'<span class="loading">正在自動登入並跳轉至首頁...</span>'
			],
			script: `
				localStorage.setItem('jwt_token', '${jwtToken}');
				document.cookie = 'jwt=${jwtToken}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax';
				setTimeout(() => {
					window.location.href = '/';
				}, 3000);
			`
		});
	} catch (error) {
		console.error('Email 驗證錯誤:', error);
		return json({ message: '伺服器錯誤，請稍後再試' }, { status: 500 });
	}
};
