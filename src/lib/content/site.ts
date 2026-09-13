export const SITE_NAME = '古董局中局';
export const SITE_URL = 'https://moa.sportify.tw';
export const HOME_TITLE = '古董局中局桌遊輔助工具｜MOA 非官方 App・免下載';
export const HOME_DESCRIPTION =
	'MOA 是《古董局中局》的免費非官方網頁桌遊輔助工具，支援 6–8 人使用手機、平板或電腦加入房間，協助鑑定、投票與遊戲流程。免下載，建議搭配實體桌遊使用。';
export const SOCIAL_IMAGE = {
	url: `${SITE_URL}/social-home.jpg`,
	width: 1200,
	height: 630,
	alt: 'MOA 古董局中局非官方桌遊輔助工具首頁，展示龍首、虎首與牛首藏品'
};

export const websiteSchema = {
	'@context': 'https://schema.org',
	'@type': 'WebSite',
	'@id': `${SITE_URL}/#website`,
	name: SITE_NAME,
	alternateName: ['MOA', '古董局中局非官方APP', 'moa.sportify.tw'],
	url: `${SITE_URL}/`,
	description: HOME_DESCRIPTION,
	inLanguage: 'zh-TW'
};
