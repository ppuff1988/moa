import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoom } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameArtifacts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	getPlayersWithRoles,
	calculateIdentificationResults,
	determineWinner
} from '$lib/server/game-identification-helpers';

// 獲取遊戲最終結果
export const GET: RequestHandler = async ({ request, params }) => {
	const verifyResult = await verifyPlayerInRoom(request, params.name!);
	if ('error' in verifyResult) {
		return verifyResult.error;
	}

	const { game } = verifyResult;

	// 檢查遊戲是否已結束
	if (game.status !== 'finished') {
		return json({ message: '遊戲尚未結束' }, { status: 400 });
	}

	try {
		// 獲取所有獸首資料
		const allArtifacts = await db
			.select()
			.from(gameArtifacts)
			.where(eq(gameArtifacts.gameId, game.id));

		// 只保留被選中的獸首（每回合的第一名和第二名）
		const selectedArtifacts = allArtifacts.filter((a) => a.voteRank === 1 || a.voteRank === 2);

		// 獲取所有玩家及其角色資訊
		const playersWithRoles = await getPlayersWithRoles(game.id);

		// 獲取鑑人結果（如果有）
		const identificationResults = await calculateIdentificationResults(game.id, playersWithRoles);

		// 決定獲勝陣營
		const xuYuanScore = game.totalScore || 0;
		const winner = determineWinner(xuYuanScore);

		return json({
			success: true,
			winner,
			xuYuanScore,
			allArtifacts: selectedArtifacts.map((a) => ({
				id: a.id,
				round: a.round,
				animal: a.animal,
				isGenuine: a.isGenuine,
				voteRank: a.voteRank,
				votes: a.votes
			})),
			players: playersWithRoles.map((p) => ({
				id: p.playerId,
				nickname: p.nickname,
				roleName: p.roleName,
				camp: p.camp,
				colorCode: p.colorCode
			})),
			identificationResults
		});
	} catch (error) {
		console.error('獲取最終結果錯誤:', error);
		return json({ message: '獲取最終結果失敗' }, { status: 500 });
	}
};
