/**
 * 將數字轉換為中文數字
 * @param num - 要轉換的數字
 * @returns 中文數字字串
 *
 * @example
 * chineseNumeral(1) // '一'
 * chineseNumeral(2) // '二'
 * chineseNumeral(10) // '十'
 * chineseNumeral(11) // '十一'
 * chineseNumeral(23) // '二十三'
 */
export function chineseNumeral(num: number): string {
	const numerals = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

	if (num < 10) {
		return numerals[num];
	}

	// 處理 10-99 的數字
	if (num < 100) {
		const tens = Math.floor(num / 10);
		const ones = num % 10;

		if (tens === 1) {
			return ones === 0 ? '十' : `十${numerals[ones]}`;
		}

		return ones === 0 ? `${numerals[tens]}十` : `${numerals[tens]}十${numerals[ones]}`;
	}

	// 如果超過 99，直接返回阿拉伯數字
	return num.toString();
}

/**
 * 格式化回合數字為中文
 * @param round - 回合數
 * @returns 格式化的回合字串，例如："第一回合"
 *
 * @example
 * formatRound(1) // '第一回合'
 * formatRound(2) // '第二回合'
 */
export function formatRound(round: number): string {
	return `第${chineseNumeral(round)}回合`;
}
