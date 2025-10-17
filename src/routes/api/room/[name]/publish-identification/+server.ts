import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { games, gameRounds, gameArtifacts } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { emitToRoom } from '$lib/server/socket';
import {
	getPlayersWithRoles,
	calculateIdentificationResults,
	calculateIdentificationScore,
	determineWinner
} from '$lib/server/game-identification-helpers';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyPlayerInRoomWithStatus(request, params.name!, 'playing');
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game, player } = verifyResult;

		// 檢查是否為房主
		if (!player.isHost) {
			return json({ message: '只有房主可以公布結果' }, { status: 403 });
		}

		// 檢查當前是否在鑑人階段
		const currentRound = await db
			.select()
			.from(gameRounds)
			.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.round, 3)))
			.limit(1);

		if (currentRound.length === 0 || currentRound[0].phase !== 'identification') {
			return json({ message: '當前不在鑑人階段' }, { status: 400 });
		}

		// 獲取所有玩家及其角色資訊
		const playersWithRoles = await getPlayersWithRoles(game.id);

		// 計算鑑人投票結果
		const identificationResults = await calculateIdentificationResults(game.id, playersWithRoles);

		// 檢查是否有藥不然
		const hasYaoburan = playersWithRoles.some((p) => p.roleName === '藥不然');

		// 計算最終分數
		const baseScore = game.totalScore || 0;
		const identificationScore = calculateIdentificationScore(identificationResults, hasYaoburan);
		const xuYuanScore = baseScore + identificationScore;

		// 決定獲勝陣營
		const winner = determineWinner(xuYuanScore);

		// 更新遊戲狀態
		await db
			.update(games)
			.set({
				status: 'finished',
				totalScore: xuYuanScore,
				finishedAt: new Date()
			})
			.where(eq(games.id, game.id));

		// 更新回合狀態
		await db
			.update(gameRounds)
			.set({
				phase: 'completed',
				completedAt: new Date()
			})
			.where(eq(gameRounds.id, currentRound[0].id));

		// 獲取所有獸首資料
		const allArtifacts = await db
			.select()
			.from(gameArtifacts)
			.where(eq(gameArtifacts.gameId, game.id));

		// 只保留被選中的獸首（每回合的第一名和第二名）
		const selectedArtifacts = allArtifacts.filter((a) => a.voteRank === 1 || a.voteRank === 2);

		const finalResult = {
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
		};

		// 廣播遊戲結束
		emitToRoom(params.name!, 'game-finished', finalResult);

		return json({
			message: `遊戲結束，${winner}獲勝！`,
			winner,
			xuYuanScore,
			identificationResults
		});
	} catch (error) {
		console.error('公布鑑人結果錯誤:', error);
		return json({ message: '公布結果失敗' }, { status: 500 });
	}
};
