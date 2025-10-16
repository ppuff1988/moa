import {
	pgTable,
	text,
	timestamp,
	integer,
	boolean,
	json,
	index,
	serial,
	uuid
} from 'drizzle-orm/pg-core';

export const user = pgTable('users', {
	id: serial('id').primaryKey(),
	email: text('email').notNull().unique(),
	nickname: text('nickname').notNull(),
	passwordHash: text('password_hash').notNull(),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const games = pgTable(
	'games',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		roomName: text('room_name').notNull().unique(), // 房間名稱必須唯一
		roomPassword: text('room_password').notNull(),
		hostId: integer('host_id')
			.notNull()
			.references(() => user.id),
		status: text('status').notNull().default('waiting'), // waiting: 等待玩家, selecting: 選角階段, playing: 遊戲中, finished: 已結束
		playerCount: integer('player_count').notNull().default(0),
		totalScore: integer('total_score').default(0), // 許愿陣營總分
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow(),
		finishedAt: timestamp('finished_at')
	},
	(table) => ({
		roomNameIdx: index('games_room_name_idx').on(table.roomName),
		statusIdx: index('games_status_idx').on(table.status)
	})
);

export const roles = pgTable('roles', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(), // 許愿, 老朝奉, 黃煙煙, 方震, 木戶加奈, 姬云浮, 鄭國渠, 藥不然
	camp: text('camp').notNull(), // 許愿陣營, 老朝奉陣營
	skill: json('skill').notNull(), // 技能種類
	canCheckArtifact: boolean('can_check_artifact').default(false), // 是否能鑑寶
	canAttack: boolean('can_attack').default(false), // 是否能偷襲
	canCheckPeople: boolean('can_check_people').default(false), // 是否能鑑定玩家
	canSwap: boolean('can_swap').default(false), // 是否能交換真偽
	canBlock: boolean('can_block').default(false), // 是否能封鎖寶物
	canFool: boolean('can_fool').default(false) // 是否能迷惑
});

export const gamePlayers = pgTable('game_players', {
	id: serial('id').primaryKey(),
	gameId: uuid('game_id')
		.notNull()
		.references(() => games.id),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	roleId: integer('role_id').references(() => roles.id),
	color: text('color'), // 紅, 橙, 黃, 綠, 藍, 紫, 黑, 白
	colorCode: text('color_code'), // #EF4444, #F97316, #EAB308, #22C55E, #3B82F6, #A855F7, #1F2937, #F3F4F6
	isHost: boolean('is_host').default(false),
	isReady: boolean('is_ready').default(false),
	isOnline: boolean('is_online').default(true),
	canAction: boolean('can_action').default(true), // 當前是否能行動
	blockedRound: integer('blocked_round'), // 記錄無法行動的回合（木戶加奈、黃煙煙技能效果）
	joinedAt: timestamp('joined_at').defaultNow(),
	lastActiveAt: timestamp('last_active_at').defaultNow()
});

export const gameArtifacts = pgTable('game_artifacts', {
	id: serial('id').primaryKey(),
	gameId: uuid('game_id')
		.notNull()
		.references(() => games.id),
	round: integer('round').notNull(), // 1, 2, 3
	animal: text('animal').notNull(), // 鼠, 牛, 虎, 兔, 龍, 蛇, 馬, 羊, 猴, 雞, 狗, 豬
	isGenuine: boolean('is_genuine').notNull(), // true: 真品, false: 假品
	isSwapped: boolean('is_swapped').default(false), // 是否老朝奉交換過
	isBlocked: boolean('is_blocked').default(false), // 是否被鄭國渠封鎖
	votes: integer('votes').default(0), // 投票數
	voteRank: integer('vote_rank') // 投票排名 (1=第一名, 2=第二名, null=未排名)
});

export const gameRounds = pgTable('game_rounds', {
	id: serial('id').primaryKey(),
	gameId: uuid('game_id')
		.notNull()
		.references(() => games.id),
	round: integer('round').notNull(), // 1, 2, 3
	phase: text('phase', {
		enum: ['action', 'discussion', 'voting', 'result', 'identification', 'completed']
	}).notNull(), // action: 行動階段, discussion: 討論階段, voting: 投票階段, result: 結果公布階段, identification: 鑑人階段, completed: 已完成
	actionOrder: json('action_order'), // [playerId1, playerId2, ...]	// 行動順序記錄
	startedAt: timestamp('started_at').defaultNow(),
	completedAt: timestamp('completed_at')
});

export const gameActions = pgTable('game_actions', {
	id: serial('id').primaryKey(),
	gameId: uuid('game_id')
		.notNull()
		.references(() => games.id),
	roundId: integer('round_id')
		.notNull()
		.references(() => gameRounds.id),
	playerId: integer('player_id')
		.notNull()
		.references(() => gamePlayers.id),
	ordering: integer('ordering').notNull(), // 行動順序
	actionData: json('action_data'), // 行動詳細資料
	timestamp: timestamp('timestamp').defaultNow()
});

export const identificationVotes = pgTable('identification_votes', {
	id: serial('id').primaryKey(),
	gameId: uuid('game_id')
		.notNull()
		.references(() => games.id),
	playerId: integer('player_id')
		.notNull()
		.references(() => gamePlayers.id),
	votedLaoChaoFeng: integer('voted_lao_chao_feng').references(() => gamePlayers.id), // 投票老朝奉
	votedXuYuan: integer('voted_xu_yuan').references(() => gamePlayers.id), // 投票許愿
	votedFangZhen: integer('voted_fang_zhen').references(() => gamePlayers.id), // 投票方震
	createdAt: timestamp('created_at').defaultNow()
});

export type Role = typeof roles.$inferSelect;
export type GameArtifact = typeof gameArtifacts.$inferSelect;
export type User = typeof user.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type GameRound = typeof gameRounds.$inferSelect;
export type GameAction = typeof gameActions.$inferSelect;
export type IdentificationVote = typeof identificationVotes.$inferSelect;
