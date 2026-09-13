import { HOME_DESCRIPTION, HOME_TITLE, SITE_URL, SOCIAL_IMAGE } from './site';

// 畫面與 JSON-LD 共用同一份問答，避免內容更新後標記失真。
export const faqItems = [
	{
		id: 'faq-about-moa',
		question: 'MOA 是什麼？是古董局中局官方 App 嗎？',
		answer:
			'MOA 是《古董局中局》的免費非官方網頁桌遊輔助工具，不是官方 App。它協助玩家建立或加入房間、進行獸首鑑定與投票，以及記錄遊戲流程。'
	},
	{
		id: 'faq-about-game',
		question: '古董局中局是什麼遊戲？',
		answer:
			'《古董局中局》是一款結合身份推理、古董鑑定與策略博弈的多人桌遊。玩家扮演不同角色，在交流情報與辨別真偽的過程中，完成各自的陣營目標。'
	},
	{
		id: 'faq-players-duration',
		question: '古董局中局需要幾個人？一局要多久？',
		answer:
			'MOA 支援 6–8 位玩家，一局遊戲約 30–60 分鐘，實際時間依討論節奏而異。第一次遊玩時，建議多留一些時間熟悉角色與規則。'
	},
	{
		id: 'faq-devices',
		question: '需要下載 App 嗎？手機可以玩嗎？',
		answer:
			'不需要下載 App。MOA 可在手機、平板或電腦的瀏覽器中使用，需保持網路連線。每位玩家使用自己的裝置登入，即可加入同一個房間。'
	},
	{
		id: 'faq-invite-friends',
		question: '如何開局並邀請朋友加入房間？',
		answer:
			'先登入 MOA，由一位玩家建立房間，將房間名稱與密碼分享給朋友。其他玩家登入後選擇加入房間，輸入相同資訊；集合 6–8 人並完成房間內的準備流程後即可開始。'
	},
	{
		id: 'faq-price',
		question: 'MOA 需要付費嗎？',
		answer: 'MOA 目前免費提供完整的桌遊輔助功能，註冊帳號或使用 Google 帳號登入即可使用。'
	},
	{
		id: 'faq-physical-game',
		question: '還需要準備實體桌遊嗎？',
		answer:
			'建議搭配《古董局中局》實體桌遊使用。MOA 是非官方輔助工具，協助進行遊戲流程與資訊記錄，讓大家更專注於桌上的交流與推理。'
	},
	{
		id: 'faq-back-home',
		question: '進入登入畫面後，如何回到首頁？',
		answer:
			'點選登入畫面左上角的「返回首頁」即可回到 MOA 公開首頁，不需要先登入。註冊與忘記密碼頁面也有相同的返回入口。'
	}
];

export const homeSchema = {
	'@context': 'https://schema.org',
	'@graph': [
		{
			'@type': 'WebPage',
			'@id': `${SITE_URL}/#webpage`,
			url: `${SITE_URL}/`,
			name: HOME_TITLE,
			description: HOME_DESCRIPTION,
			inLanguage: 'zh-TW',
			isPartOf: { '@id': `${SITE_URL}/#website` },
			mainEntity: { '@id': `${SITE_URL}/#application` },
			hasPart: { '@id': `${SITE_URL}/#faq` },
			primaryImageOfPage: {
				'@type': 'ImageObject',
				url: SOCIAL_IMAGE.url,
				width: SOCIAL_IMAGE.width,
				height: SOCIAL_IMAGE.height,
				caption: SOCIAL_IMAGE.alt
			}
		},
		{
			'@type': 'WebApplication',
			'@id': `${SITE_URL}/#application`,
			name: 'MOA 古董局中局非官方桌遊輔助工具',
			url: `${SITE_URL}/`,
			description: HOME_DESCRIPTION,
			applicationCategory: 'GameApplication',
			operatingSystem: 'Any',
			browserRequirements: '支援 JavaScript 的現代瀏覽器，需網路連線。',
			isAccessibleForFree: true,
			inLanguage: 'zh-TW',
			image: `${SITE_URL}/pwa-icon-512.png`
		},
		{
			'@type': 'FAQPage',
			'@id': `${SITE_URL}/#faq`,
			url: `${SITE_URL}/#faq`,
			name: '古董局中局與 MOA 常見問題',
			inLanguage: 'zh-TW',
			isPartOf: { '@id': `${SITE_URL}/#webpage` },
			mainEntity: faqItems.map((item) => ({
				'@type': 'Question',
				'@id': `${SITE_URL}/#${item.id}`,
				url: `${SITE_URL}/#${item.id}`,
				name: item.question,
				acceptedAnswer: { '@type': 'Answer', text: item.answer }
			}))
		}
	]
};
