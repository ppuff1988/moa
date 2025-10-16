import { json } from '@sveltejs/kit';
import type { User, Game, GamePlayer, GameRound, Role } from './db/schema';
import { getUserFromJWT, verifyJWTWithError } from './auth';
import { db } from './db';
import { games, gamePlayers, gameRounds, roles } from './db/schema';
import { eq, and, desc } from 'drizzle-orm';

type AuthResult = { error: Response } | { user: User };

type PlayerInRoomResult =
	| { error: Response }
	| { user: User; game: typeof games.$inferSelect; player: typeof gamePlayers.$inferSelect };

type HostPermissionResult = { error: Response } | { user: User; game: Game };

type PlayerInGameResult =
	| { error: Response }
	| { user: User; game: Game; player: GamePlayer; currentRound: GameRound };

type PlayerInRoomWithStatusResult =
	| { error: Response }
	| { user: User; game: Game; player: GamePlayer };

type HostInRoomWithStatusResult = { error: Response } | { user: User; game: Game };

type PlayerWithRoleResult =
	| { error: Response }
	| { user: User; game: Game; player: GamePlayer; role: Role };

type HostInRoomResult = { error: Response } | { user: User; game: Game; player: GamePlayer };

type CanActionCheckResult = { canAct: true } | { canAct: false; error: Response };

// 統一的身份驗證函數，只接受 Request 物件
export async function verifyAuthToken(request: Request): Promise<AuthResult> {
	const authHeader = request.headers.get('Authorization');

	// Check for token in Authorization header or cookie
	let token: string | undefined;

	if (authHeader?.startsWith('Bearer ')) {
		token = authHeader.substring(7); // Remove 'Bearer ' prefix
	} else {
		// Try to get token from cookie
		const cookieHeader = request.headers.get('cookie');
		if (cookieHeader) {
			const cookies = cookieHeader.split(';').map((c) => c.trim());
			const jwtCookie = cookies.find((c) => c.startsWith('jwt='));
			if (jwtCookie) {
				token = jwtCookie.substring(4); // Remove 'jwt=' prefix
			}
		}
	}

	if (!token) {
		return {
			error: json({ message: '需要認證' }, { status: 401 })
		};
	}

	// 使用新的驗證函數來區分過期和無效
	const verifyResult = verifyJWTWithError(token);

	if (!verifyResult.payload) {
		if (verifyResult.error === 'expired') {
			return {
				error: json({ message: '認證令牌已過期，請重新登入' }, { status: 401 })
			};
		}
		return {
			error: json({ message: '無效的認證令牌' }, { status: 401 })
		};
	}

	// 從資料庫獲取用戶資料
	const user = await getUserFromJWT(token);

	if (!user) {
		return {
			error: json({ message: '用戶不存在' }, { status: 401 })
		};
	}

	return { user };
}

// 驗證玩家是否在房間中
export async function verifyPlayerInRoom(
	request: Request,
	roomName: string
): Promise<PlayerInRoomResult> {
	const authResult = await verifyAuthToken(request);
	if ('error' in authResult) {
		return authResult;
	}
	const { user } = authResult;

	// 查找房間
	const [game] = await db
		.select()
		.from(games)
		.where(eq(games.roomName, decodeURIComponent(roomName)))
		.limit(1);

	if (!game) {
		return {
			error: json({ message: '房間不存在' }, { status: 404 })
		};
	}

	// 檢查玩家是否在房間中
	const [player] = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, user.id)))
		.limit(1);

	if (!player) {
		return {
			error: json({ message: '您不在此房間中' }, { status: 403 })
		};
	}

	return { user, game, player };
}

// 驗證房主權限
export async function verifyHostPermission(
	request: Request,
	roomName: string
): Promise<HostPermissionResult> {
	const authResult = await verifyAuthToken(request);
	if ('error' in authResult) {
		return authResult;
	}
	const { user } = authResult;

	// 查找房間
	const [game] = await db
		.select()
		.from(games)
		.where(eq(games.roomName, decodeURIComponent(roomName)))
		.limit(1);

	if (!game) {
		return {
			error: json({ message: '房間不存在' }, { status: 404 })
		};
	}

	// 檢查是否為房主
	if (game.hostId !== user.id) {
		return {
			error: json({ message: '只有房主可以執行此操作' }, { status: 403 })
		};
	}

	return { user, game };
}

// 驗證玩家在遊戲中且遊戲正在進行，並返回當前回合資訊
export async function verifyPlayerInGame(
	request: Request,
	roomName: string
): Promise<PlayerInGameResult> {
	const authResult = await verifyAuthToken(request);
	if ('error' in authResult) {
		return authResult;
	}
	const { user } = authResult;

	// 查找房間
	const [game] = await db
		.select()
		.from(games)
		.where(eq(games.roomName, decodeURIComponent(roomName)))
		.limit(1);

	if (!game) {
		return {
			error: json({ message: '房間不存在' }, { status: 404 })
		};
	}

	// 檢查玩家是否在房間中
	const [player] = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, user.id)))
		.limit(1);

	if (!player) {
		return {
			error: json({ message: '您不在此房間中' }, { status: 403 })
		};
	}

	// 檢查遊戲狀態
	if (game.status !== 'playing') {
		return {
			error: json({ message: '遊戲尚未開始' }, { status: 400 })
		};
	}

	// 獲取當前回合資訊
	const [currentRound] = await db
		.select()
		.from(gameRounds)
		.where(eq(gameRounds.gameId, game.id))
		.orderBy(desc(gameRounds.round))
		.limit(1);

	if (!currentRound) {
		return {
			error: json({ message: '找不到當前回合資訊' }, { status: 404 })
		};
	}

	return { user, game, player, currentRound };
}

// 驗證玩家在房間中且遊戲狀態符合指定狀態
export async function verifyPlayerInRoomWithStatus(
	request: Request,
	roomName: string,
	requiredStatus: string
): Promise<PlayerInRoomWithStatusResult> {
	const authResult = await verifyAuthToken(request);
	if ('error' in authResult) {
		return authResult;
	}
	const { user } = authResult;

	// 查找房間
	const [game] = await db
		.select()
		.from(games)
		.where(eq(games.roomName, decodeURIComponent(roomName)))
		.limit(1);

	if (!game) {
		return {
			error: json({ message: '房間不存在' }, { status: 404 })
		};
	}

	// 檢查玩家是否在房間中
	const [player] = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, user.id)))
		.limit(1);

	if (!player) {
		return {
			error: json({ message: '您不在此房間中' }, { status: 403 })
		};
	}

	// 檢查遊戲狀態
	if (game.status !== requiredStatus) {
		const statusMessages: Record<string, string> = {
			waiting: '遊戲尚未開始',
			selecting: '必須在選角階段才能執行此操作',
			playing: '遊戲尚未開始',
			finished: '遊戲已結束'
		};
		return {
			error: json(
				{
					message: statusMessages[requiredStatus] || '遊戲狀態不符合要求'
				},
				{ status: 400 }
			)
		};
	}

	return { user, game, player };
}

// 驗證房主權限並檢查遊戲狀態
export async function verifyHostWithStatus(
	request: Request,
	roomName: string,
	requiredStatus?: string
): Promise<HostInRoomWithStatusResult> {
	const authResult = await verifyAuthToken(request);
	if ('error' in authResult) {
		return authResult;
	}
	const { user } = authResult;

	// 查找房間
	const [game] = await db
		.select()
		.from(games)
		.where(eq(games.roomName, decodeURIComponent(roomName)))
		.limit(1);

	if (!game) {
		return {
			error: json({ message: '房間不存在' }, { status: 404 })
		};
	}

	// 檢查是否為房主
	if (game.hostId !== user.id) {
		return {
			error: json({ message: '只有房主可以執行此操作' }, { status: 403 })
		};
	}

	// 如果需要檢查遊戲狀態
	if (requiredStatus && game.status !== requiredStatus) {
		const statusMessages: Record<string, string> = {
			waiting: '只能在等待階段執行此操作',
			selecting: '只能在選角階段執行此操作',
			playing: '只能在遊戲進行中執行此操作',
			finished: '遊戲已結束'
		};
		return {
			error: json(
				{
					message: statusMessages[requiredStatus] || '遊戲狀態不符合要求'
				},
				{ status: 400 }
			)
		};
	}

	return { user, game };
}

// 驗證玩家角色（統一處理角色驗證邏輯）
export async function verifyPlayerRole(
	request: Request,
	roomName: string
): Promise<PlayerWithRoleResult> {
	const verifyResult = await verifyPlayerInRoom(request, roomName);
	if ('error' in verifyResult) {
		return verifyResult;
	}

	const { user, game, player } = verifyResult;

	// 檢查玩家是否有角色
	if (!player.roleId) {
		return {
			error: json(
				{
					success: false,
					message: '你還沒有選擇角色'
				},
				{ status: 400 }
			)
		};
	}

	// 獲取玩家角色資訊
	const [role] = await db.select().from(roles).where(eq(roles.id, player.roleId)).limit(1);

	if (!role) {
		return {
			error: json(
				{
					success: false,
					message: '角色不存在'
				},
				{ status: 400 }
			)
		};
	}

	return { user, game, player, role };
}

// 驗證房主權限（在房間中且為房主）
export async function verifyHostInRoom(
	request: Request,
	roomName: string
): Promise<HostInRoomResult> {
	const verifyResult = await verifyPlayerInRoom(request, roomName);
	if ('error' in verifyResult) {
		return verifyResult;
	}

	const { user, game, player } = verifyResult;

	// 檢查是否為房主
	if (!player.isHost) {
		return {
			error: json(
				{
					error: '只有房主可以執行此操作'
				},
				{ status: 403 }
			)
		};
	}

	return { user, game, player };
}

// 獲取當前回合
export async function getCurrentRound(gameId: string): Promise<GameRound | null> {
	const [currentRound] = await db
		.select()
		.from(gameRounds)
		.where(eq(gameRounds.gameId, gameId))
		.orderBy(desc(gameRounds.round))
		.limit(1);

	return currentRound || null;
}

// 獲取當前回合，如果不存在則返回錯誤 Response
export async function getCurrentRoundOrError(
	gameId: string
): Promise<{ round: GameRound } | { error: Response }> {
	const currentRound = await getCurrentRound(gameId);

	if (!currentRound) {
		return {
			error: json(
				{
					success: false,
					message: '當前沒有進行中的回合'
				},
				{ status: 400 }
			)
		};
	}

	return { round: currentRound };
}

/**
 * 計算下一個行動的順序編號
 * 查詢整個回合中所有玩家的行動記錄，返回下一個應該使用的 ordering 值
 *
 * @param gameId - 遊戲 ID
 * @param roundId - 回合 ID
 * @returns 下一個行動的順序編號（從 1 開始）
 */
export async function getNextActionOrdering(gameId: string, roundId: number): Promise<number> {
	const { gameActions } = await import('./db/schema');

	const allRoundActions = await db
		.select()
		.from(gameActions)
		.where(and(eq(gameActions.gameId, gameId), eq(gameActions.roundId, roundId)));

	return allRoundActions.length + 1;
}

/**
 * 檢查是否需要還原 canAction
 * 在玩家行動結束（指派下一位玩家）時調用
 * 條件：
 * 1. 所有技能都用完（鑑定 + 其他技能如交換、攻擊、封鎖等）
 * 2. 當前回合等於封鎖回合（blocked_round）
 * 3. 不是永久封鎖
 *
 * @param playerId - 玩家 ID
 * @param blockedRound - 封鎖回合
 * @param currentRoundNumber - 當前回合號碼
 * @param roleSkill - 角色技能配置
 */
export async function restoreCanActionIfNeeded(
	playerId: number,
	blockedRound: number | null,
	currentRoundNumber: number,
	roleSkill: Record<string, number> | null
): Promise<void> {
	const { PERMANENT_BLOCK_ROUND } = await import('./constants');
	const { gameActions, gameRounds } = await import('./db/schema');

	const notPermanentBlock = blockedRound !== PERMANENT_BLOCK_ROUND;
	const isBlockedRound = blockedRound === currentRoundNumber;

	if (!isBlockedRound || !notPermanentBlock) {
		return; // 不在封鎖回合或永久封鎖，直接返回
	}

	// 查詢當前回合
	const [currentRound] = await db
		.select()
		.from(gameRounds)
		.where(eq(gameRounds.round, currentRoundNumber))
		.limit(1);

	if (!currentRound) return;

	// 查詢玩家在當前回合的所有行動
	const actions = await db
		.select()
		.from(gameActions)
		.where(and(eq(gameActions.playerId, playerId), eq(gameActions.roundId, currentRound.id)));

	// 統計各種技能使用次數
	const identifyArtifactCount = actions.filter((a) => {
		const data = a.actionData as { type?: string } | null;
		return data?.type === 'identify_artifact';
	}).length;

	const identifyPlayerCount = actions.filter((a) => {
		const data = a.actionData as { type?: string } | null;
		return data?.type === 'identify_player';
	}).length;

	const swapCount = actions.filter((a) => {
		const data = a.actionData as { type?: string } | null;
		return data?.type === 'swap_artifacts';
	}).length;

	const attackCount = actions.filter((a) => {
		const data = a.actionData as { type?: string } | null;
		return data?.type === 'attack_player';
	}).length;

	const blockCount = actions.filter((a) => {
		const data = a.actionData as { type?: string } | null;
		return data?.type === 'block_artifact';
	}).length;

	// 檢查所有技能是否都達到上限
	const maxCheckArtifact = roleSkill?.checkArtifact || 0;
	const maxCheckPeople = roleSkill?.checkPeople || 0;
	const maxSwap = roleSkill?.swap || 0;
	const maxAttack = roleSkill?.attack || 0;
	const maxBlock = roleSkill?.block || 0;

	const identifyArtifactUsed = identifyArtifactCount >= maxCheckArtifact;
	const identifyPlayerUsed = identifyPlayerCount >= maxCheckPeople;
	const swapUsed = swapCount >= maxSwap;
	const attackUsed = attackCount >= maxAttack;
	const blockUsed = blockCount >= maxBlock;

	// 所有技能都用完才能還原
	const allSkillsUsed =
		identifyArtifactUsed && identifyPlayerUsed && swapUsed && attackUsed && blockUsed;

	console.log(`[還原行動檢查] 玩家 ${playerId} 在回合 ${currentRoundNumber} 行動結束，技能使用:`, {
		identifyArtifact: `${identifyArtifactCount}/${maxCheckArtifact}`,
		identifyPlayer: `${identifyPlayerCount}/${maxCheckPeople}`,
		swap: `${swapCount}/${maxSwap}`,
		attack: `${attackCount}/${maxAttack}`,
		block: `${blockCount}/${maxBlock}`,
		allUsed: allSkillsUsed
	});

	if (allSkillsUsed) {
		console.log(`[還原行動] 玩家 ${playerId} 所有技能用完，還原 can_action`);
		await db.update(gamePlayers).set({ canAction: true }).where(eq(gamePlayers.id, playerId));
	} else {
		console.log(`[還原行動] 玩家 ${playerId} 還有技能未用完，不還原 can_action`);
	}
}

/**
 * 檢查玩家是否能執行行動
 * 檢查 canAction 狀態，如果為 false 則返回錯誤響應
 *
 * @param player - 玩家對象
 * @returns 如果可以行動返回 { canAct: true }，否則返回 { canAct: false, error: Response }
 */
export function checkPlayerCanAction(player: { canAction: boolean | null }): CanActionCheckResult {
	if (player.canAction === false) {
		return {
			canAct: false,
			error: json(
				{
					success: false,
					message: '你被攻擊封鎖，無法執行此操作',
					blocked: true
				},
				{ status: 403 }
			)
		};
	}

	return { canAct: true };
}

/**
 * 檢查玩家是否已經執行過某種類型的行動
 *
 * @param existingActions - 現有的行動記錄
 * @param actionType - 要檢查的行動類型
 * @returns 如果已執行過該行動返回 true
 */
export function hasPerformedAction(
	existingActions: Array<{ actionData: unknown }>,
	actionType: string
): boolean {
	return existingActions.some((action) => {
		const actionData = action.actionData as { type?: string } | null;
		return actionData?.type === actionType;
	});
}

/**
 * 統計玩家執行某種行動的次數
 *
 * @param existingActions - 現有的行動記錄
 * @param actionType - 要統計的行動類型
 * @returns 行動次數
 */
export function countActionsByType(
	existingActions: Array<{ actionData: unknown }>,
	actionType: string
): number {
	return existingActions.filter((action) => {
		const actionData = action.actionData as { type?: string } | null;
		return actionData?.type === actionType;
	}).length;
}
