export type SeatingMode = 'random' | 'manual';
export type ArtifactClaim = 'genuine' | 'fake' | 'unable';
export interface DiscussionPlayer {
	playerId: number;
	nickname: string;
	color: string | null;
	colorCode: string | null;
	seatPosition: number | null;
	actionPosition: number | null;
	speakingPosition: number | null;
}
export interface DiscussionNote {
	subjectPlayerId: number;
	artifactClaims: Record<string, ArtifactClaim>;
	claimedAttacked: boolean;
	memo: string;
	version: number;
}
export type NoteChange =
	| { field: 'artifact'; artifactId: number; value: ArtifactClaim | null }
	| { field: 'claimedAttacked'; value: boolean }
	| { field: 'memo'; value: string };
export interface NotePatch {
	round: number;
	subjectPlayerId: number;
	expectedVersion: number;
	change: NoteChange;
}
export interface DiscussionData {
	gameId: string;
	ownerPlayerId: number;
	round: number;
	availableRounds: number[];
	editable: boolean;
	notesAvailable: boolean;
	seatOrder: number[] | null;
	players: DiscussionPlayer[];
	artifacts: Array<{ id: number; animal: string }>;
	myClaims: Record<string, ArtifactClaim>;
}
