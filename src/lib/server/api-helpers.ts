import { json } from '@sveltejs/kit';
import type { User, Game, GamePlayer, GameRound, Role } from './db/schema';
import { getUserFromJWT, verifyJWTWithError } from './auth';
import { db } from './db';
import { games, gamePlayers, gameRounds, roles } from './db/schema';
import { eq, and, desc } from 'drizzle-orm';

// ==================== 類型定義 ====================

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

// ==================== 錯誤響應工廠函數 ====================

const ErrorResponses = {
	needAuth: () => json({ message: '需要認證' }, { status: 401 }),
	tokenExpired: () => json({ message: '認證令牌已過期，請重新登入' }, { status: 401 }),
	invalidToken: () => json({ message: '無效的認證令牌' }, { status: 401 }),
	userNotFound: () => json({ message: '用戶不存在' }, { status: 401 }),
	roomNotFound: () => json({ message: '房間不存在' }, { status: 404 }),
	notInRoom: () => json({ message: '您不在此房間中' }, { status: 403 }),
	notHost: () => json({ message: '只有房主可以執行此操作' }, { status: 403 }),
	gameNotStarted: () => json({ message: '遊戲尚未開始' }, { status: 400 }),
	roundNotFound: () => json({ message: '找不到當前回合資訊' }, { status: 404 }),
	noRole: () => json({ success: false, message: '你還沒有選擇角色' }, { status: 400 }),
	roleNotFound: () => json({ success: false, message: '角色不存在' }, { status: 400 }),
	noCurrentRound: () => json({ success: false, message: '當前沒有進行中的回合' }, { status: 400 }),
	blocked: () =>
		json(
			{ success: false, message: '你被攻擊封鎖，無法執行此操作', blocked: true },
			{ status: 403 }
		),
	wrongStatus: (requiredStatus: string) => {
		const statusMessages: Record<string, string> = {
			waiting: '遊戲尚未開始',
			selecting: '必須在選角階段才能執行此操作',
			playing: '遊戲尚未開始',
			finished: '遊戲已結束',
			terminated: '遊戲已被強制結束'
		};
		return json(
			{ message: statusMessages[requiredStatus] || '遊戲狀態不符合要求' },
			{ status: 400 }
		);
	},
	wrongHostStatus: (requiredStatus: string) => {
		const statusMessages: Record<string, string> = {
			waiting: '只能在等待階段執行此操作',
			selecting: '只能在選角階段執行此操作',
			playing: '只能在遊戲進行中執行此操作',
			finished: '遊戲已結束',
			terminated: '遊戲已被強制結束'
		};
		return json(
			{ message: statusMessages[requiredStatus] || '遊戲狀態不符合要求' },
			{ status: 400 }
		);
	}
};

// ==================== 輔助函數 ====================

/**
 * 從請求中提取 JWT Token
 */
function extractToken(request: Request): string | undefined {
	const authHeader = request.headers.get('Authorization');

	if (authHeader?.startsWith('Bearer ')) {
		return authHeader.substring(7);
	}

	const cookieHeader = request.headers.get('cookie');
	if (cookieHeader) {
		const cookies = cookieHeader.split(';').map((c) => c.trim());
		const jwtCookie = cookies.find((c) => c.startsWith('jwt='));
		if (jwtCookie) {
			return jwtCookie.substring(4);
		}
	}

	return undefined;
}

/**
 * 根據房間名稱查找遊戲
 */
async function findGameByRoomName(roomName: string): Promise<Game | null> {
	const [game] = await db
		.select()
		.from(games)
		.where(eq(games.roomName, decodeURIComponent(roomName)))
		.limit(1);

	return game || null;
}

/**
 * 查找玩家在遊戲中的記錄
 */
async function findPlayerInGame(
	gameId: string,
	userId: number
): Promise<typeof gamePlayers.$inferSelect | null> {
	const [player] = await db
		.select()
		.from(gamePlayers)
		.where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)))
		.limit(1);

	return player || null;
}

/**
 * 檢查遊戲狀態是否符合要求
 */
function validateGameStatus(
	game: Game,
	requiredStatus: string
): { valid: true } | { valid: false; error: Response } {
	if (game.status !== requiredStatus) {
		return { valid: false, error: ErrorResponses.wrongStatus(requiredStatus) };
	}
	return { valid: true };
}

// ==================== 核心驗證函數 ====================

/**
 * 統一的身份驗證函數
 */
export async function verifyAuthToken(request: Request): Promise<AuthResult> {
	const token = extractToken(request);

	if (!token) {
		return { error: ErrorResponses.needAuth() };
	}

	const verifyResult = verifyJWTWithError(token);

	if (!verifyResult.payload) {
		if (verifyResult.error === 'expired') {
			return { error: ErrorResponses.tokenExpired() };
		}
		return { error: ErrorResponses.invalidToken() };
	}

	const user = await getUserFromJWT(token);

	if (!user) {
		return { error: ErrorResponses.userNotFound() };
	}

	return { user };
}

/**
 * 驗證玩家是否在房間中
 */
export async function verifyPlayerInRoom(
	request: Request,
	roomName: string
): Promise<PlayerInRoomResult> {
	const authResult = await verifyAuthToken(request);
	if ('error' in authResult) {
		return authResult;
	}
	const { user } = authResult;

	const game = await findGameByRoomName(roomName);
	if (!game) {
		return { error: ErrorResponses.roomNotFound() };
	}

	const player = await findPlayerInGame(game.id, user.id);
	if (!player) {
		return { error: ErrorResponses.notInRoom() };
	}

	return { user, game, player };
}

/**
 * 驗證房主權限
 */
export async function verifyHostPermission(
	request: Request,
	roomName: string
): Promise<HostPermissionResult> {
	const authResult = await verifyAuthToken(request);
	if ('error' in authResult) {
		return authResult;
	}
	const { user } = authResult;

	const game = await findGameByRoomName(roomName);
	if (!game) {
		return { error: ErrorResponses.roomNotFound() };
	}

	if (game.hostId !== user.id) {
		return { error: ErrorResponses.notHost() };
	}

	return { user, game };
}

/**
 * 驗證玩家在遊戲中且遊戲正在進行，並返回當前回合資訊
 */
export async function verifyPlayerInGame(
	request: Request,
	roomName: string
): Promise<PlayerInGameResult> {
	const verifyResult = await verifyPlayerInRoom(request, roomName);
	if ('error' in verifyResult) {
		return verifyResult;
	}

	const { user, game, player } = verifyResult;

	if (game.status !== 'playing') {
		return { error: ErrorResponses.gameNotStarted() };
	}

	const currentRound = await getCurrentRound(game.id);
	if (!currentRound) {
		return { error: ErrorResponses.roundNotFound() };
	}

	return { user, game, player, currentRound };
}

/**
 * 驗證玩家在房間中且遊戲狀態符合指定狀態
 */
export async function verifyPlayerInRoomWithStatus(
	request: Request,
	roomName: string,
	requiredStatus: string
): Promise<PlayerInRoomWithStatusResult> {
	const verifyResult = await verifyPlayerInRoom(request, roomName);
	if ('error' in verifyResult) {
		return verifyResult;
	}

	const { user, game, player } = verifyResult;

	const statusCheck = validateGameStatus(game, requiredStatus);
	if (!statusCheck.valid) {
		return { error: statusCheck.error };
	}

	return { user, game, player };
}

/**
 * 驗證房主權限並檢查遊戲狀態
 */
export async function verifyHostWithStatus(
	request: Request,
	roomName: string,
	requiredStatus?: string | string[]
): Promise<HostInRoomWithStatusResult> {
	const authResult = await verifyAuthToken(request);
	if ('error' in authResult) {
		return authResult;
	}
	const { user } = authResult;

	const game = await findGameByRoomName(roomName);
	if (!game) {
		return { error: ErrorResponses.roomNotFound() };
	}

	if (game.hostId !== user.id) {
		return { error: ErrorResponses.notHost() };
	}

	if (requiredStatus) {
		const allowedStatuses = Array.isArray(requiredStatus) ? requiredStatus : [requiredStatus];
		if (!allowedStatuses.includes(game.status)) {
			return { error: ErrorResponses.wrongHostStatus(allowedStatuses[0]) };
		}
	}

	return { user, game };
}

/**
 * 驗證玩家角色（統一處理角色驗證邏輯）
 */
export async function verifyPlayerRole(
	request: Request,
	roomName: string
): Promise<PlayerWithRoleResult> {
	const verifyResult = await verifyPlayerInRoom(request, roomName);
	if ('error' in verifyResult) {
		return verifyResult;
	}

	const { user, game, player } = verifyResult;

	if (!player.roleId) {
		return { error: ErrorResponses.noRole() };
	}

	const [role] = await db.select().from(roles).where(eq(roles.id, player.roleId)).limit(1);

	if (!role) {
		return { error: ErrorResponses.roleNotFound() };
	}

	return { user, game, player, role };
}

/**
 * 驗證房主權限（在房間中且為房主）
 */
export async function verifyHostInRoom(
	request: Request,
	roomName: string
): Promise<HostInRoomResult> {
	const verifyResult = await verifyPlayerInRoom(request, roomName);
	if ('error' in verifyResult) {
		return verifyResult;
	}

	const { user, game, player } = verifyResult;

	if (!player.isHost) {
		return { error: ErrorResponses.notHost() };
	}

	return { user, game, player };
}

// ==================== 回合相關函數 ====================

/**
 * 獲取當前回合
 */
export async function getCurrentRound(gameId: string): Promise<GameRound | null> {
	const [currentRound] = await db
		.select()
		.from(gameRounds)
		.where(eq(gameRounds.gameId, gameId))
		.orderBy(desc(gameRounds.round))
		.limit(1);

	return currentRound || null;
}

/**
 * 獲取當前回合，如果不存在則返回錯誤 Response
 */
export async function getCurrentRoundOrError(
	gameId: string
): Promise<{ round: GameRound } | { error: Response }> {
	const currentRound = await getCurrentRound(gameId);

	if (!currentRound) {
		return { error: ErrorResponses.noCurrentRound() };
	}

	return { round: currentRound };
}

// ==================== 行動相關函數 ====================

/**
 * 計算下一個行動的順序編號
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
 * 檢查玩家是否能執行行動
 */
export function checkPlayerCanAction(
	player: {
		canAction: boolean | null;
		attackedRounds?: number[] | null;
	},
	roleName?: string
): CanActionCheckResult {
	// 姬云浮特殊規則：被攻擊後永遠無法行動
	if (roleName === '姬云浮' && player.attackedRounds && player.attackedRounds.length > 0) {
		return { canAct: false, error: ErrorResponses.blocked() };
	}

	// 一般玩家的封鎖檢查
	if (player.canAction === false) {
		return { canAct: false, error: ErrorResponses.blocked() };
	}

	return { canAct: true };
}

/**
 * 檢查玩家是否已經執行過某種類型的行動
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

/**
 * 統計玩家在當前回合的技能使用情況
 */
interface SkillUsageCount {
	identifyArtifact: number;
	identifyPlayer: number;
	swap: number;
	attack: number;
	block: number;
}

export function countSkillUsage(actions: Array<{ actionData: unknown }>): SkillUsageCount {
	const counts: SkillUsageCount = {
		identifyArtifact: 0,
		identifyPlayer: 0,
		swap: 0,
		attack: 0,
		block: 0
	};

	for (const action of actions) {
		const data = action.actionData as { type?: string } | null;
		if (!data?.type) continue;

		switch (data.type) {
			case 'identify_artifact':
				counts.identifyArtifact++;
				break;
			case 'identify_player':
				counts.identifyPlayer++;
				break;
			case 'swap_artifacts':
				counts.swap++;
				break;
			case 'attack_player':
				counts.attack++;
				break;
			case 'block_artifact':
				counts.block++;
				break;
		}
	}

	return counts;
}

/**
 * 檢查所有技能是否都已用完
 */
export function areAllSkillsUsed(
	usageCounts: SkillUsageCount,
	roleSkill: Record<string, number> | null
): boolean {
	if (!roleSkill) return false;

	const maxCheckArtifact = roleSkill.checkArtifact || 0;
	const maxCheckPeople = roleSkill.checkPeople || 0;
	const maxSwap = roleSkill.swap || 0;
	const maxAttack = roleSkill.attack || 0;
	const maxBlock = roleSkill.block || 0;

	return (
		usageCounts.identifyArtifact >= maxCheckArtifact &&
		usageCounts.identifyPlayer >= maxCheckPeople &&
		usageCounts.swap >= maxSwap &&
		usageCounts.attack >= maxAttack &&
		usageCounts.block >= maxBlock
	);
}

/**
 * 還原玩家的行動能力（如果符合條件）
 */
export async function restoreCanActionIfNeeded(
	playerId: number,
	blockedRound: number | null,
	attackedRounds: number[] | null,
	currentRoundNumber: number,
	roleSkill: Record<string, number> | null
): Promise<void> {
	const { gameActions } = await import('./db/schema');

	const isAttackedThisRound = attackedRounds?.includes(currentRoundNumber) ?? false;

	// 檢查是否因為天生技能（黃煙煙、木戶加奈）而被封鎖
	const isNaturalBlockedRound = blockedRound === currentRoundNumber;

	// 如果不在任何封鎖回合，直接返回
	if (!isAttackedThisRound && !isNaturalBlockedRound) {
		return;
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

	// 統計技能使用情況
	const usageCounts = countSkillUsage(actions);

	// 檢查所有技能是否都用完
	if (areAllSkillsUsed(usageCounts, roleSkill)) {
		// 恢復 canAction，讓玩家可以在下一回合行動
		// 注意：姬云浮如果被攻擊過，attackedRounds 會有值，在鑑定時會被永久封鎖
		await db.update(gamePlayers).set({ canAction: true }).where(eq(gamePlayers.id, playerId));
	}
}
