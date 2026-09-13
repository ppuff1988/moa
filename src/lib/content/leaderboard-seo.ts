import { SITE_URL } from './site';
import type { LeaderboardResult } from '$lib/types/leaderboard';

export function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026');
}

export function createLeaderboardSchema({
	path,
	title,
	description,
	leaderboard,
	roleName
}: {
	path: string;
	title: string;
	description: string;
	leaderboard: LeaderboardResult;
	roleName?: string;
}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		'@id': `${SITE_URL}${path}#webpage`,
		url: `${SITE_URL}${path}`,
		name: title,
		description,
		inLanguage: 'zh-TW',
		isPartOf: { '@id': `${SITE_URL}/#website` },
		...(roleName ? { about: { '@type': 'Thing', name: roleName } } : {}),
		mainEntity: {
			'@type': 'ItemList',
			name: title,
			numberOfItems: leaderboard.entries.length,
			itemListElement: leaderboard.entries.map((entry, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				name: entry.nickname,
				description: `${entry.wins} 勝、${entry.games} 場、勝率 ${entry.winRate.toFixed(1)}%`
			}))
		}
	};
}
