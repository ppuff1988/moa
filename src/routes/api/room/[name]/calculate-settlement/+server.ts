import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { games, gameArtifacts, gameRounds, gamePlayers, roles, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { emitToRoom } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyPlayerInRoomWithStatus(request, params.name!, 'playing');
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game, player } = verifyResult;

		// 檢查是否為房主
		if (!player.isHost) {
			return json({ message: '只有房主可以進行結算' }, { status: 403 });
		}

		// 檢查當前是否為第三輪
		const currentRound = await db
			.select()
			.from(gameRounds)
			.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.round, 3)))
			.limit(1);

		if (currentRound.length === 0 || currentRound[0].phase !== 'result') {
			return json({ message: '必須在第三輪結果階段才能結算' }, { status: 400 });
		}

		// 獲取所有三輪的獸首資料
		const allArtifacts = await db
			.select()
			.from(gameArtifacts)
			.where(eq(gameArtifacts.gameId, game.id));

		// 只保留被選中的獸首（每回合的第一名和第二名）
		const selectedArtifacts = allArtifacts.filter((a) => a.voteRank === 1 || a.voteRank === 2);

		// 計算每一輪的前兩名真品數
		let genuineCount = 0;

		for (let round = 1; round <= 3; round++) {
			const roundArtifacts = selectedArtifacts.filter((a) => a.round === round);

			roundArtifacts.forEach((artifact) => {
				if (artifact.isGenuine) {
					genuineCount++;
				}
			});
		}

		// 如果真品數達到6分，許愿陣營直接獲勝
		if (genuineCount === 6) {
			await db
				.update(games)
				.set({
					status: 'finished',
					totalScore: 6,
					finishedAt: new Date()
				})
				.where(eq(games.id, game.id));

			// 獲取所有玩家資訊
			const playersWithRoles = await db
				.select({
					playerId: gamePlayers.id,
					userId: gamePlayers.userId,
					nickname: user.nickname,
					roleName: roles.name,
					camp: roles.camp,
					colorCode: gamePlayers.colorCode
				})
				.from(gamePlayers)
				.leftJoin(roles, eq(gamePlayers.roleId, roles.id))
				.innerJoin(user, eq(gamePlayers.userId, user.id))
				.where(eq(gamePlayers.gameId, game.id));

			// 更新回合狀態為completed
			await db
				.update(gameRounds)
				.set({ phase: 'completed' })
				.where(eq(gameRounds.id, currentRound[0].id));

			const finalResult = {
				winner: '許愿陣營',
				xuYuanScore: 6,
				genuineCount: 6,
				needIdentification: false,
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
				identificationResults: null
			};

			// 廣播遊戲結束
			emitToRoom(params.name!, 'game-finished', finalResult);

			return json({
				message: '許愿陣營獲勝！',
				winner: '許愿陣營',
				xuYuanScore: 6,
				genuineCount: 6,
				needIdentification: false
			});
		}

		// 如果真品數小於6分，進入鑑人階段
		await db
			.update(games)
			.set({
				totalScore: genuineCount
			})
			.where(eq(games.id, game.id));

		// 更新回合階段為identification（鑑人階段）
		await db
			.update(gameRounds)
			.set({ phase: 'identification' })
			.where(eq(gameRounds.id, currentRound[0].id));

		// 廣播進入鑑人階段
		emitToRoom(params.name!, 'enter-identification-phase', {
			message: `進入鑑人階段`
		});

		return json({
			message: '進入鑑人階段',
			needIdentification: true
		});
	} catch (error) {
		console.error('結算計算錯誤:', error);
		return json({ message: '結算計算失敗' }, { status: 500 });
	}
};
