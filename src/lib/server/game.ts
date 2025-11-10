import { db } from './db';
import {
	games,
	gamePlayers,
	user,
	gameArtifacts,
	gameRounds,
	roles,
	gameActions
} from './db/schema';
import { eq, and, sql } from 'drizzle-orm';

// 遊戲角色配置
export const GAME_ROLES = {
	6: {
		good: ['許愿', '黃煙煙', '方震', '木戶加奈'],
		bad: ['老朝奉', '藥不然']
	},
	7: {
		good: ['許愿', '黃煙煙', '方震', '木戶加奈', '姬云浮'],
		bad: ['老朝奉', '藥不然']
	},
	8: {
		good: ['許愿', '黃煙煙', '方震', '木戶加奈', '姬云浮'],
		bad: ['老朝奉', '鄭國渠', '藥不然']
	}
};

// 十二生肖獸首
export const ZODIAC_ANIMALS = [
	'鼠',
	'牛',
	'虎',
	'兔',
	'龍',
	'蛇',
	'馬',
	'羊',
	'猴',
	'雞',
	'狗',
	'豬'
];

/**
 * 生成唯一的6碼數字房間名稱
 */
export async function generateUniqueRoomName(): Promise<string> {
	const maxAttempts = 100; // 最多嘗試100次

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		// 生成6碼隨機數字 (100000-999999)
		const roomName = Math.floor(100000 + Math.random() * 900000).toString();

		// 檢查是否已存在
		const existingGame = await db.select().from(games).where(eq(games.roomName, roomName)).limit(1);

		if (existingGame.length === 0) {
			return roomName;
		}
	}

	throw new Error('無法生成唯一的房間名稱，請稍後再試');
}

// 創建遊戲
export async function createGame(roomName: string, roomPassword: string, hostId: number) {
	// 檢查房間名稱是否已存在
	const existingGame = await db
		.select()
		.from(games)
		.where(and(eq(games.roomName, roomName), eq(games.status, 'waiting')))
		.limit(1);

	if (existingGame.length > 0) {
		throw new Error('房間名稱已存在');
	}

	// 創建遊戲
	const [game] = await db
		.insert(games)
		.values({
			roomName,
			roomPassword,
			hostId,
			status: 'waiting',
			playerCount: 0,
			totalScore: 0
		})
		.returning();

	return game;
}

// 加入遊戲
export async function joinGame(gameId: string, userId: number, isHost: boolean = false) {
	// 檢查遊戲是否存在
	const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);

	if (!game) {
		throw new Error('遊戲不存在');
	}

	// 檢查遊戲狀態
	if (game.status !== 'waiting') {
		throw new Error('遊戲已開始，無法加入');
	}

	// 檢查房間是否已滿
	if (game.playerCount >= 8) {
		throw new Error('房間已滿');
	}

	// 檢查玩家是否已在遊戲中
	const existingPlayer = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)))
		.limit(1);

	if (existingPlayer.length > 0) {
		throw new Error('玩家已在遊戲中');
	}

	// 獲取玩家資訊
	const [userInfo] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

	if (!userInfo) {
		throw new Error('用戶不存在');
	}

	// 加入遊戲
	const [player] = await db
		.insert(gamePlayers)
		.values({
			gameId,
			userId,
			isHost,
			isReady: false,
			isOnline: true,
			canAction: true
		})
		.returning();

	// 更新遊戲玩家數量
	await db
		.update(games)
		.set({
			playerCount: game.playerCount + 1,
			updatedAt: new Date()
		})
		.where(eq(games.id, gameId));

	return {
		id: player.id,
		userId: userId,
		nickname: userInfo.nickname,
		avatar: userInfo.avatar,
		isHost: isHost,
		isReady: false,
		color: null,
		roleId: null
	};
}

// 獲取遊戲狀態
export async function getGameState(gameId: string) {
	const [game] = await db.select().from(games).where(eq(games.id, gameId));
	if (!game) throw new Error('遊戲不存在');

	const players = await db
		.select({
			id: gamePlayers.id,
			gameId: gamePlayers.gameId,
			userId: gamePlayers.userId,
			roleId: gamePlayers.roleId,
			color: gamePlayers.color,
			colorCode: gamePlayers.colorCode,
			isHost: gamePlayers.isHost,
			isReady: gamePlayers.isReady,
			isOnline: gamePlayers.isOnline,
			canAction: gamePlayers.canAction,
			joinedAt: gamePlayers.joinedAt,
			lastActiveAt: gamePlayers.lastActiveAt,
			nickname: user.nickname,
			avatar: user.avatar
		})
		.from(gamePlayers)
		.leftJoin(user, eq(gamePlayers.userId, user.id))
		.where(eq(gamePlayers.gameId, gameId))
		.orderBy(gamePlayers.joinedAt);

	return {
		game,
		players
	};
}

// 更新玩家在線狀態
export async function updatePlayerOnlineStatus(gameId: string, userId: number, isOnline: boolean) {
	await db
		.update(gamePlayers)
		.set({
			isOnline,
			lastActiveAt: new Date()
		})
		.where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)));
}

// 更新玩家準備狀態
export async function updatePlayerReadyStatus(playerId: number, isReady: boolean) {
	await db.update(gamePlayers).set({ isReady }).where(eq(gamePlayers.id, playerId));
}

// 獲取遊戲玩家列表
export async function getGamePlayers(gameId: string) {
	return await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, gameId));
}

// 開始選角階段
export async function startRoleSelection(gameId: string) {
	// 獲取遊戲信息
	const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);

	if (!game) {
		throw new Error('遊戲不存在');
	}

	// 檢查遊戲狀態
	if (game.status !== 'waiting') {
		throw new Error('遊戲已經開始或正在選角');
	}

	// 獲取玩家數量
	const players = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, gameId));

	if (players.length < 6 || players.length > 8) {
		throw new Error('玩家人數必須為 6-8 人');
	}

	// 更新遊戲狀態為選角階段
	await db
		.update(games)
		.set({
			status: 'selecting',
			updatedAt: new Date()
		})
		.where(eq(games.id, gameId));

	return { gameId, playerCount: players.length };
}

// 開始遊戲
export async function startGame(gameId: string) {
	// 獲取遊戲信息
	const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);

	if (!game) {
		throw new Error('遊戲不存在');
	}

	// 檢查遊戲狀態（必須在選角階段）
	if (game.status !== 'selecting') {
		throw new Error('必須先開始選角才能開始遊戲');
	}

	// 獲取所有玩家
	const players = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, gameId));

	if (players.length < 6 || players.length > 8) {
		throw new Error('玩家人數必須為 6-8 人');
	}

	// 檢查所有玩家是否準備完成
	const readyPlayers = players.filter((p) => p.isReady);
	if (readyPlayers.length !== players.length) {
		throw new Error('所有玩家必須準備完成才能開始遊戲');
	}

	// 檢查所有玩家是否都已選擇角色
	const playersWithRole = players.filter((p) => p.roleId);
	if (playersWithRole.length !== players.length) {
		throw new Error('所有玩家必須選擇角色才能開始遊戲');
	}

	// 檢查所有玩家是否都已選擇顏色
	const playersWithColor = players.filter((p) => p.color);
	if (playersWithColor.length !== players.length) {
		throw new Error('所有玩家必須選擇顏色才能開始遊戲');
	}

	// 更新遊戲狀態
	await db
		.update(games)
		.set({
			status: 'playing',
			updatedAt: new Date()
		})
		.where(eq(games.id, gameId));

	// ========== 遊戲初始化 ==========

	// 1. 初始化 gameArtifacts：隨機生成12生肖獸首，確保每回合2真2假
	// 先隨機打亂12生肖順序
	const shuffledAnimals = [...ZODIAC_ANIMALS];
	for (let i = shuffledAnimals.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffledAnimals[i], shuffledAnimals[j]] = [shuffledAnimals[j], shuffledAnimals[i]];
	}

	// 為每個回合分配4個獸首（2真2假）
	const artifactsToInsert: {
		gameId: string;
		round: number;
		animal: string;
		isGenuine: boolean;
		isSwapped: boolean;
		isBlocked: boolean;
		votes: number;
	}[] = [];
	for (let round = 1; round <= 3; round++) {
		// 從打亂的生肖陣列中取出4個
		const startIndex = (round - 1) * 4;
		const roundAnimals = shuffledAnimals.slice(startIndex, startIndex + 4);

		// 為這4個獸首隨機分配2真2假
		const genuineFlags = [true, true, false, false];
		for (let i = genuineFlags.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[genuineFlags[i], genuineFlags[j]] = [genuineFlags[j], genuineFlags[i]];
		}

		// 創建該回合的4個獸首資料
		roundAnimals.forEach((animal, index) => {
			artifactsToInsert.push({
				gameId,
				round,
				animal,
				isGenuine: genuineFlags[index],
				isSwapped: false,
				isBlocked: false,
				votes: 0
			});
		});
	}

	await db.insert(gameArtifacts).values(artifactsToInsert);

	// 2. 創建第一輪並隨機決定第一個玩家
	// 隨機選擇一個玩家作為第一個行動的玩家
	const randomPlayerIndex = Math.floor(Math.random() * players.length);
	const firstPlayerId = players[randomPlayerIndex].id;

	const [round] = await db
		.insert(gameRounds)
		.values({
			gameId,
			round: 1,
			phase: 'action',
			actionOrder: [firstPlayerId] // 設定第一個玩家
		})
		.returning();

	// 3. 為黃煙煙和木戶加奈的玩家設置隨機無法鑑定的回合(1-3)
	// 先取得黃煙煙和木戶加奈的角色ID
	const specialRoles = await db
		.select()
		.from(roles)
		.where(sql`${roles.name} IN ('黃煙煙', '木戶加奈')`);

	const specialRoleIds = specialRoles.map((role) => role.id);

	// 找出扮演這些角色的玩家
	const specialPlayers = players.filter((p) => p.roleId && specialRoleIds.includes(p.roleId));

	// 為每個特殊角色玩家設置隨機的無法鑑定回合
	for (const player of specialPlayers) {
		const blockedRound = Math.floor(Math.random() * 3) + 1; // 隨機1-3

		await db
			.update(gamePlayers)
			.set({
				blockedRound
			})
			.where(eq(gamePlayers.id, player.id));
	}

	// 通知房間內所有玩家遊戲已開始
	const { getSocketIO } = await import('./socket');
	const io = getSocketIO();
	if (io) {
		io.to(game.roomName).emit('game-started', {
			gameId,
			roundId: round.id,
			roomName: game.roomName
		});
	}

	return { gameId, roundId: round.id };
}

// 踢出玩家
export async function kickPlayer(gameId: string, targetUserId: number, requesterId: number) {
	// 獲取遊戲信息
	const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);

	if (!game) {
		throw new Error('遊戲不存在');
	}

	// 驗證請求者是否為房主
	const [requester] = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, requesterId)))
		.limit(1);

	if (!requester || !requester.isHost) {
		throw new Error('只有房主才能踢出玩家');
	}

	// 不能踢自己
	if (requesterId === targetUserId) {
		throw new Error('房主不能踢自己');
	}

	// 獲取被踢玩家的信息
	const [targetPlayer] = await db
		.select({
			id: gamePlayers.id,
			userId: gamePlayers.userId,
			nickname: user.nickname
		})
		.from(gamePlayers)
		.leftJoin(user, eq(gamePlayers.userId, user.id))
		.where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, targetUserId)))
		.limit(1);

	if (!targetPlayer) {
		throw new Error('玩家不在房間中');
	}

	// 刪除玩家的所有相關數據
	// 1. 刪除玩家的行動記錄
	await db
		.delete(gameActions)
		.where(and(eq(gameActions.gameId, gameId), eq(gameActions.playerId, targetPlayer.id)));

	// 2. 刪除玩家記錄
	await db
		.delete(gamePlayers)
		.where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, targetUserId)));

	// 3. 更新遊戲人數
	await db
		.update(games)
		.set({
			playerCount: sql`${games.playerCount} - 1`,
			updatedAt: new Date()
		})
		.where(eq(games.id, gameId));

	return {
		targetUserId,
		targetNickname: targetPlayer.nickname || `玩家${targetUserId}`
	};
}

// 檢查玩家是否可以行動
export async function canPlayerTakeAction(playerId: number, currentRound: number) {
	// 獲取玩家資訊
	const [player] = await db
		.select({
			id: gamePlayers.id,
			roleId: gamePlayers.roleId,
			canAction: gamePlayers.canAction,
			blockedRound: gamePlayers.blockedRound
		})
		.from(gamePlayers)
		.where(eq(gamePlayers.id, playerId))
		.limit(1);

	if (!player) {
		return { canAct: false, reason: '玩家不存在' };
	}

	// 檢查 canAction 是否為 false
	if (player.canAction === false) {
		return { canAct: false, reason: 'canAction 為 false' };
	}

	// 如果玩家有角色，檢查是否為木戶加奈或黃煙煙
	if (player.roleId) {
		const [role] = await db
			.select({
				name: roles.name
			})
			.from(roles)
			.where(eq(roles.id, player.roleId))
			.limit(1);

		if (role && (role.name === '木戶加奈' || role.name === '黃煙煙')) {
			// 檢查 blockedRound 是否與當前回合吻合
			if (player.blockedRound === currentRound) {
				return { canAct: false, reason: `${role.name} 在回合 ${currentRound} 被封鎖` };
			}
		}
	}

	return { canAct: true, reason: null };
}

// 獲取玩家的技能行動次數
export async function getPlayerSkillActions(playerId: number) {
	const [player] = await db
		.select({
			roleId: gamePlayers.roleId
		})
		.from(gamePlayers)
		.where(eq(gamePlayers.id, playerId))
		.limit(1);

	if (!player || !player.roleId) {
		return null;
	}

	const [role] = await db
		.select({
			name: roles.name,
			skill: roles.skill
		})
		.from(roles)
		.where(eq(roles.id, player.roleId))
		.limit(1);

	if (!role || !role.skill) {
		return null;
	}

	// skill 是一個 JSON 物件，例如: { check_artifact: 2, check_people: 1, block: 1, attack: 1 }
	const skillData = role.skill as Record<string, number>;

	return {
		roleName: role.name,
		skills: {
			checkArtifact: skillData.checkArtifact || 0, // 可以鑑定幾次寶物
			checkPeople: skillData.checkPeople || 0, // 可以鑑定幾次人
			block: skillData.block || 0, // 可以封鎖幾個獸首
			attack: skillData.attack || 0, // 可以攻擊幾位玩家
			swap: skillData.swap || 0 // 可以交換幾次
		}
	};
}

// 前進到下一個玩家
export async function advanceToNextPlayer(gameId: string, currentRoundId: number) {
	// 獲取當前回合資訊
	const [currentRound] = await db
		.select()
		.from(gameRounds)
		.where(eq(gameRounds.id, currentRoundId))
		.limit(1);

	if (!currentRound) {
		throw new Error('回合不存在');
	}

	// 獲取所有玩家
	const allPlayers = await db
		.select({
			id: gamePlayers.id,
			roleId: gamePlayers.roleId,
			canAction: gamePlayers.canAction,
			blockedRound: gamePlayers.blockedRound
		})
		.from(gamePlayers)
		.where(eq(gamePlayers.gameId, gameId))
		.orderBy(gamePlayers.joinedAt);

	// 獲取已經行動過的玩家
	const completedActions = await db
		.select({
			playerId: gameActions.playerId,
			ordering: gameActions.ordering
		})
		.from(gameActions)
		.where(and(eq(gameActions.gameId, gameId), eq(gameActions.roundId, currentRoundId)))
		.orderBy(gameActions.ordering);

	const completedPlayerIds = completedActions.map((a) => a.playerId);

	// 找出還沒行動的玩家
	const remainingPlayers = allPlayers.filter((p) => !completedPlayerIds.includes(p.id));

	// 從剩餘玩家中找出下一個可以行動的玩家
	let nextPlayerId: number | null = null;

	for (const player of remainingPlayers) {
		const { canAct } = await canPlayerTakeAction(player.id, currentRound.round);
		if (canAct) {
			nextPlayerId = player.id;
			break;
		}
	}

	// 如果找不到可以行動的玩家，代表本回合行動階段結束
	if (nextPlayerId === null) {
		// 標記回合完成時間
		await db
			.update(gameRounds)
			.set({
				phase: 'discussion',
				completedAt: new Date()
			})
			.where(eq(gameRounds.id, currentRoundId));

		return {
			nextPlayerId: null,
			phaseChanged: true,
			newPhase: 'discussion',
			lastPlayerId:
				completedActions.length > 0 ? completedActions[completedActions.length - 1].playerId : null
		};
	}

	// 更新 actionOrder，將下一個玩家設為當前行動玩家
	const currentActionOrder = (currentRound.actionOrder as number[]) || [];
	const newActionOrder = [nextPlayerId, ...currentActionOrder.filter((id) => id !== nextPlayerId)];

	await db
		.update(gameRounds)
		.set({
			actionOrder: newActionOrder
		})
		.where(eq(gameRounds.id, currentRoundId));

	return {
		nextPlayerId,
		phaseChanged: false,
		newPhase: null,
		lastPlayerId: null
	};
}

// 開始新回合（第二、三回合）
export async function startNewRound(gameId: string, roundNumber: number) {
	if (roundNumber < 2 || roundNumber > 3) {
		throw new Error('回合數必須為 2 或 3');
	}

	// 檢查上一個回合是否存在且已完成
	const [previousRound] = await db
		.select()
		.from(gameRounds)
		.where(and(eq(gameRounds.gameId, gameId), eq(gameRounds.round, roundNumber - 1)))
		.limit(1);

	if (!previousRound) {
		throw new Error(`第 ${roundNumber - 1} 回合不存在`);
	}

	if (!previousRound.completedAt) {
		throw new Error(`第 ${roundNumber - 1} 回合尚未完成`);
	}

	// 檢查新回合是否已存在
	const [existingRound] = await db
		.select()
		.from(gameRounds)
		.where(and(eq(gameRounds.gameId, gameId), eq(gameRounds.round, roundNumber)))
		.limit(1);

	if (existingRound) {
		throw new Error(`第 ${roundNumber} 回合已存在`);
	}

	// 獲取上一回合最後一個行動的玩家
	const lastActions = await db
		.select({
			playerId: gameActions.playerId,
			ordering: gameActions.ordering
		})
		.from(gameActions)
		.where(and(eq(gameActions.gameId, gameId), eq(gameActions.roundId, previousRound.id)))
		.orderBy(gameActions.ordering);

	if (lastActions.length === 0) {
		throw new Error('上一回合沒有任何玩家行動記錄');
	}

	// 最後一個行動的玩家
	const lastPlayerId = lastActions[lastActions.length - 1].playerId;

	// 創建新回合，並將上一回合最後一位玩家設為第一位
	const [newRound] = await db
		.insert(gameRounds)
		.values({
			gameId,
			round: roundNumber,
			phase: 'action',
			actionOrder: [lastPlayerId] // 上一回合最後一位玩家成為本回合第一位
		})
		.returning();

	// 獲取遊戲信息以取得 roomName
	const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);

	// 通知房間內所有玩家新回合已開始
	if (game) {
		const { getSocketIO } = await import('./socket');
		const io = getSocketIO();
		if (io) {
			io.to(game.roomName).emit('round-started', {
				gameId,
				roundId: newRound.id,
				round: roundNumber,
				phase: 'action',
				firstPlayerId: lastPlayerId,
				roomName: game.roomName
			});
		}
	}

	return {
		roundId: newRound.id,
		round: roundNumber,
		firstPlayerId: lastPlayerId
	};
}

// 從討論階段進入投票階段
export async function startVotingPhase(gameId: string, currentRoundNumber: number) {
	// 獲取當前回合
	const [currentRound] = await db
		.select()
		.from(gameRounds)
		.where(and(eq(gameRounds.gameId, gameId), eq(gameRounds.round, currentRoundNumber)))
		.limit(1);

	if (!currentRound) {
		throw new Error('當前回合不存在');
	}

	if (currentRound.phase !== 'discussion') {
		throw new Error(`當前階段是 ${currentRound.phase}，不是討論階段`);
	}

	// 更新為投票階段
	await db
		.update(gameRounds)
		.set({
			phase: 'voting'
		})
		.where(eq(gameRounds.id, currentRound.id));

	return {
		roundId: currentRound.id,
		round: currentRound.round,
		phase: 'voting'
	};
}

// 從投票階段完成，準備進入下一回合或結束遊戲
export async function completeVotingPhase(gameId: string, currentRoundNumber: number) {
	// 獲取當前回合
	const [currentRound] = await db
		.select()
		.from(gameRounds)
		.where(and(eq(gameRounds.gameId, gameId), eq(gameRounds.round, currentRoundNumber)))
		.limit(1);

	if (!currentRound) {
		throw new Error('當前回合不存在');
	}

	if (currentRound.phase !== 'voting') {
		throw new Error(`當前階段是 ${currentRound.phase}，不是投票階段`);
	}

	// 標記當前回合完成
	await db
		.update(gameRounds)
		.set({
			phase: 'completed',
			completedAt: new Date()
		})
		.where(eq(gameRounds.id, currentRound.id));

	// 判斷是否需要進入下一回合
	let nextRoundInfo = null;
	if (currentRoundNumber < 3) {
		// 自動開始下一回合
		try {
			nextRoundInfo = await startNewRound(gameId, currentRoundNumber + 1);
		} catch (error) {
			// 如果無法自動開始下一回合，返回需要手動開始的訊息
			console.error('無法自動開始下一回合:', error);
		}
	}

	return {
		roundCompleted: currentRoundNumber,
		isGameFinished: currentRoundNumber === 3,
		nextRound: nextRoundInfo
	};
}

// 獲取當前回合狀態
export async function getCurrentRoundStatus(gameId: string) {
	const [currentRound] = await db
		.select()
		.from(gameRounds)
		.where(eq(gameRounds.gameId, gameId))
		.orderBy(sql`${gameRounds.round} DESC`)
		.limit(1);

	if (!currentRound) {
		return null;
	}

	return {
		roundId: currentRound.id,
		round: currentRound.round,
		phase: currentRound.phase,
		startedAt: currentRound.startedAt,
		completedAt: currentRound.completedAt
	};
}

// 強制結束遊戲（當玩家人數不足時）
export async function forceEndGame(gameId: string, reason: string) {
	// 1. 刪除所有玩家記錄（讓所有玩家自動離開房間）
	await db.delete(gamePlayers).where(eq(gamePlayers.gameId, gameId));

	// 2. 更新遊戲狀態為強制結束
	await db
		.update(games)
		.set({
			status: 'terminated',
			playerCount: 0,
			finishedAt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(games.id, gameId));

	return {
		success: true,
		reason,
		finishedAt: new Date()
	};
}
