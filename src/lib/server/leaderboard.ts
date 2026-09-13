import { error } from '@sveltejs/kit';
import { db } from './db';
import { buildLeaderboardQuery } from './leaderboard-query';
import type { LeaderboardResult } from '$lib/types/leaderboard';

function positiveInteger(value: string | null, fallback: number | null): number | null {
	if (value === null) return fallback;
	if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
		error(400, '排行榜參數不正確');
	}
	return Number(value);
}

export async function getLeaderboard(role: string | null, requestedPage: string | null) {
	const roleId = positiveInteger(role, null);
	const page = positiveInteger(requestedPage, 1)!;
	let result: LeaderboardResult;
	try {
		const rows = await db.execute(buildLeaderboardQuery({ roleId, page }));
		result = rows[0] as unknown as LeaderboardResult;
	} catch (cause) {
		console.error('載入排行榜失敗:', cause);
		error(503, '排行榜暫時無法載入，請稍後重試。');
	}
	if (roleId !== null && !result.roles.some((item) => item.id === roleId)) {
		error(404, '找不到這個角色的排行榜');
	}
	return { ...result, selectedRoleId: roleId };
}
