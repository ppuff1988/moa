import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPlayerInRoomWithStatus } from '$lib/server/api-helpers';
import { db } from '$lib/server/db';
import { gameArtifacts, gameRounds } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { ZODIAC_ORDER } from '$lib/server/constants';
import { emitToRoom } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const verifyResult = await verifyPlayerInRoomWithStatus(request, params.name!, 'playing');
		if ('error' in verifyResult) {
			return verifyResult.error;
		}

		const { game } = verifyResult;

		// 解析請求body
		const body = await request.json();
		const { votes } = body;

		if (!votes || typeof votes !== 'object') {
			return json({ message: '投票資料格式錯誤' }, { status: 400 });
		}

		// 先獲取當前回合資訊
		const currentRound = await db
			.select()
			.from(gameRounds)
			.where(and(eq(gameRounds.gameId, game.id), eq(gameRounds.phase, 'voting')))
			.limit(1);

		if (currentRound.length === 0) {
			return json({ message: '找不到當前投票回合' }, { status: 400 });
		}

		const round = currentRound[0].round;

		// 獲取當前回合的所有獸首（加上 round 條件）
		const artifacts = await db
			.select()
			.from(gameArtifacts)
			.where(and(eq(gameArtifacts.gameId, game.id), eq(gameArtifacts.round, round)));

		// 創建投票數組用於排序
		const votedArtifacts = artifacts.map((artifact) => ({
			id: artifact.id,
			animal: artifact.animal,
			round: artifact.round,
			votes: votes[artifact.id.toString()] || 0,
			isGenuine: artifact.isGenuine
		}));

		// 排序規則：
		// 1. 票數高的在前
		// 2. 同票數時，按12生肖排序（鼠最小，豬最大）
		votedArtifacts.sort((a, b) => {
			if (b.votes !== a.votes) {
				return b.votes - a.votes; // 票數降序
			}
			// 同票數時，按生肖順序
			const orderA = ZODIAC_ORDER.indexOf(a.animal);
			const orderB = ZODIAC_ORDER.indexOf(b.animal);
			return orderA - orderB; // 生肖順序升序（鼠最小）
		});

		// 更新獸首的投票數和排名（只更新當前回合的獸首）
		for (let i = 0; i < votedArtifacts.length; i++) {
			const artifact = votedArtifacts[i];
			const voteCount = artifact.votes;
			const rank = i < 2 ? i + 1 : null; // 只標記前兩名

			await db
				.update(gameArtifacts)
				.set({
					votes: voteCount,
					voteRank: rank
				})
				.where(eq(gameArtifacts.id, artifact.id));
		}

		// 更新回合階段為 'result'
		await db
			.update(gameRounds)
			.set({ phase: 'result' })
			.where(eq(gameRounds.id, currentRound[0].id));

		// 取得第二名的資訊
		const secondPlace = votedArtifacts.length >= 2 ? votedArtifacts[1] : null;

		// 廣播投票結果給房間內所有玩家
		emitToRoom(params.name!, 'voting-completed', {
			phase: 'result',
			topTwo: votedArtifacts.slice(0, 2).map((a) => ({
				id: a.id,
				animal: a.animal,
				votes: a.votes
			})),
			secondPlace: secondPlace
				? {
						id: secondPlace.id,
						animal: secondPlace.animal,
						votes: secondPlace.votes,
						isGenuine: secondPlace.isGenuine
					}
				: null
		});

		return json({
			success: true,
			message: '投票提交成功',
			topTwo: votedArtifacts.slice(0, 2).map((a) => ({
				id: a.id,
				animal: a.animal,
				votes: a.votes
			})),
			secondPlace: secondPlace
				? {
						id: secondPlace.id,
						animal: secondPlace.animal,
						votes: secondPlace.votes,
						isGenuine: secondPlace.isGenuine
					}
				: null
		});
	} catch (error) {
		console.error('提交投票時發生錯誤:', error);
		const message = error instanceof Error ? error.message : '提交投票失敗';
		return json({ message }, { status: 400 });
	}
};
