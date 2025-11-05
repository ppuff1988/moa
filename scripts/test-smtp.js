/**
 * SMTP 連線測試腳本
 * 用於驗證 SMTP 設定是否正確
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

const config = {
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT || '587'),
	secure: process.env.SMTP_SECURE === 'true',
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASSWORD
	}
};

console.log('🔍 SMTP 設定檢查...\n');
console.log('主機:', config.host);
console.log('埠號:', config.port);
console.log('安全連線 (SSL):', config.secure);
console.log('使用者:', config.auth.user);
console.log('密碼:', config.auth.pass ? '********' : '未設定');
console.log('');

if (!config.host || !config.auth.user || !config.auth.pass) {
	console.error('❌ 錯誤：缺少必要的 SMTP 設定');
	console.error('請在 .env 檔案中設定：');
	console.error('  SMTP_HOST');
	console.error('  SMTP_PORT');
	console.error('  SMTP_USER');
	console.error('  SMTP_PASSWORD');
	process.exit(1);
}

console.log('📧 測試 SMTP 連線...\n');

const transporter = nodemailer.createTransport(config);

// 驗證連線
transporter.verify(function (error) {
	if (error) {
		console.error('❌ SMTP 連線失敗：');
		console.error(error.message);
		console.error('');
		console.error('可能的原因：');
		console.error('1. SMTP 主機或埠號不正確');
		console.error('2. 使用者名稱或密碼不正確');
		console.error('3. 需要使用應用程式專用密碼（Gmail）');
		console.error('4. 防火牆阻擋連線');
		process.exit(1);
	} else {
		console.log('✅ SMTP 連線成功！');
		console.log('');

		// 詢問是否發送測試郵件
		// 使用 SMTP_FROM_EMAIL 或預設測試地址
		const testEmail = process.env.SMTP_FROM_EMAIL || 'test@example.com';
		console.log(`📮 發送測試郵件到 ${testEmail}...`);

		transporter
			.sendMail({
				from: `"${process.env.SMTP_FROM_NAME || 'MOA'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
				to: testEmail,
				subject: '✅ SMTP 測試成功 - MOA',
				html: `
					<!DOCTYPE html>
					<html lang="zh-TW">
					<head>
						<meta charset="UTF-8">
						<style>
							body { 
								font-family: 'Microsoft JhengHei', 'PingFang TC', Arial, sans-serif; 
								line-height: 1.6; 
								background-color: #f5f5f5; 
								margin: 0; 
								padding: 20px; 
							}
							.container { 
								max-width: 600px; 
								margin: 0 auto; 
								background-color: #E8D9C5; 
								border-radius: 8px; 
								overflow: hidden; 
								box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); 
								border: 1px solid #7A6E5E;
							}
							.header { 
								background-color: #A52422; 
								color: #F5F1E8; 
								padding: 30px; 
								text-align: center; 
								border-bottom: 2px solid #C6A664;
							}
							.header h1 { 
								margin: 0; 
								font-size: 24px;
							}
							.content { 
								background: #E8D9C5; 
								padding: 30px; 
								color: #4a3f35; 
							}
							.success { 
								color: #4B6F5B; 
								font-size: 18px; 
								font-weight: bold; 
							}
							.info { 
								background: #F5F1E8; 
								padding: 15px; 
								border-left: 4px solid #C6A664; 
								margin: 20px 0; 
								border-radius: 4px; 
							}
							.footer { 
								background-color: #7A6E5E; 
								color: #F5F1E8; 
								padding: 20px; 
								text-align: center; 
								font-size: 13px; 
								border-top: 2px solid #C6A664; 
							}
						</style>
					</head>
					<body>
						<div class="container">
							<div class="header">
								<h1>🎉 SMTP 設定成功！</h1>
							</div>
							<div class="content">
								<p class="success">✅ 恭喜！您的 SMTP 設定已正確配置。</p>
								<p>這是一封測試郵件，確認您的郵件服務能正常運作。</p>
								<div class="info">
									<strong>📊 設定資訊：</strong><br>
									主機：${config.host}<br>
									埠號：${config.port}<br>
									安全連線：${config.secure ? '是' : '否'}<br>
									測試時間：${new Date().toLocaleString('zh-TW')}
								</div>
								<p>現在您可以使用忘記密碼功能了！</p>
							</div>
							<div class="footer">
								<strong>古董局中局 - MOA</strong><br>
								此郵件由系統自動發送
							</div>
						</div>
					</body>
					</html>
				`,
				text: `
SMTP 設定成功！

這是一封測試郵件，確認您的郵件服務能正常運作。

設定資訊：
主機：${config.host}
埠號：${config.port}
安全連線：${config.secure ? '是' : '否'}
測試時間：${new Date().toLocaleString('zh-TW')}

現在您可以使用忘記密碼功能了！
				`
			})
			.then((info) => {
				console.log('✅ 測試郵件發送成功！');
				console.log('郵件 ID:', info.messageId);
				console.log('');
				console.log('🎉 所有測試通過！SMTP 設定完成。');
				process.exit(0);
			})
			.catch((error) => {
				console.error('❌ 測試郵件發送失敗：');
				console.error(error.message);
				process.exit(1);
			});
	}
});
