// Game-related type definitions

export interface Player {
	id: number | string;
	userId: number;
	nickname: string;
	roleId?: number | null;
	color?: string | null;
	colorCode?: string;
	actionStatus?: string;
	roleName?: string | null;
	role?: string | null; // Alias for roleName for compatibility
	camp?: string; // Player's camp: 'good' or 'bad'
	isHost: boolean;
	isReady: boolean;
	isOnline: boolean;
	avatar?: string | null; // Player's avatar URL
}

export interface User {
	id: number;
	nickname: string;
}

export interface BeastHead {
	id: number;
	animal: string;
	isGenuine: boolean;
	isBlocked?: boolean;
	votes: number;
	voteRank?: number | null;
	round?: number;
}

export interface ActionedPlayer {
	id: number;
	nickname: string;
	color: string;
	colorCode: string;
	roleName?: string | null;
}

export interface SkillActions {
	checkArtifact: number;
	checkPeople: number;
	block: number;
	attack: number;
	swap: number;
}

export interface IdentifiedPlayerResult {
	playerId: number;
	nickname: string;
	camp: string;
}

export type GamePhase = 'identification' | 'skill' | 'assign-next';

export type RoundPhase =
	| 'action'
	| 'discussion'
	| 'voting'
	| 'result'
	| 'identification'
	| 'finished';

export interface PerformedAction {
	type: string;
	data: Record<string, unknown>;
}

export interface UsedSkills {
	checkArtifact: number;
	checkPeople: number;
	block: number;
	attack: number;
	swap: number;
}

export interface IdentificationResult {
	success: boolean;
	targetId: number;
	targetName?: string;
	actualName?: string;
	votes?: number;
	required?: number;
}

export interface FinalGameResult {
	winner: string;
	xuYuanScore: number;
	identificationResults?: {
		laoChaoFeng?: IdentificationResult;
		xuYuan?: IdentificationResult;
		fangZhen?: IdentificationResult;
	};
	allArtifacts: BeastHead[];
	players: Array<{
		id: number;
		nickname: string;
		roleName: string;
		camp: string;
		colorCode: string;
	}>;
}
