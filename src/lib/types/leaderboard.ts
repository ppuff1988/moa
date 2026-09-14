export interface LeaderboardEntry {
	nickname: string;
	rank: number;
	wins: number;
	games: number;
	winRate: number;
}

export interface AwardWinner {
	nickname: string;
}

export interface LeaderboardRole {
	id: number;
	name: string;
	camp: 'good' | 'bad';
	leaderWins: number;
	leaderCount: number;
	leaders: AwardWinner[];
}

export interface LeaderboardResult {
	entries: LeaderboardEntry[];
	roles: LeaderboardRole[];
	totalPlayers: number;
	totalGames: number;
	totalWins: number;
	leaderWins: number;
	leaderCount: number;
	leaders: AwardWinner[];
	lastFinishedAt: string | null;
}
