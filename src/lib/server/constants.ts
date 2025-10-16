// 遊戲相關常量

// 顏色對應的 hex 值
export const COLOR_MAP: Record<string, string> = {
	紅: '#EF4444',
	橙: '#F97316',
	黃: '#EAB308',
	綠: '#22C55E',
	藍: '#3B82F6',
	紫: '#A855F7',
	黑: '#1F2937',
	白: '#F3F4F6'
};

// 有效的顏色選項
export const VALID_COLORS = ['紅', '橙', '黃', '綠', '藍', '紫', '黑', '白'] as const;

// 顏色類型
export type PlayerColor = (typeof VALID_COLORS)[number];

// 遊戲人數限制
export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 8;

// 回合數
export const TOTAL_ROUNDS = 3;

// 永久封鎖標記（用於姬云浮）
export const PERMANENT_BLOCK_ROUND = 999;

// 12生肖排序（用於同票數時的排序）
export const ZODIAC_ORDER = [
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

// 12生肖順序對照表
export const ZODIAC_ORDER_MAP: Record<string, number> = {
	鼠: 1,
	牛: 2,
	虎: 3,
	兔: 4,
	龍: 5,
	蛇: 6,
	馬: 7,
	羊: 8,
	猴: 9,
	雞: 10,
	狗: 11,
	豬: 12
};
