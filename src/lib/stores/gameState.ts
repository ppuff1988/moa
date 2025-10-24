// Game state management utilities
import { writable, derived } from 'svelte/store';
import type {
	Player,
	BeastHead,
	ActionedPlayer,
	SkillActions,
	IdentifiedPlayerResult,
	GamePhase,
	PerformedAction,
	UsedSkills
} from '$lib/types/game';

export function createGameState() {
	// Core state
	const players = writable<Player[]>([]);
	const beastHeads = writable<BeastHead[]>([]);
	const actionedPlayers = writable<ActionedPlayer[]>([]);
	const currentActionPlayer = writable<ActionedPlayer | null>(null);
	const currentRound = writable<number>(1);
	const roundPhase = writable<string>('action');
	const isHost = writable<boolean>(false);

	// Player-specific state
	const currentPlayerRole = writable<string | null>(null);
	const skillActions = writable<SkillActions | null>(null);
	const hasLoadedSkills = writable<boolean>(false);
	const canAction = writable<boolean>(true);

	// Skill usage tracking
	const usedSkills = writable<UsedSkills>({
		checkArtifact: 0,
		checkPeople: 0,
		block: 0,
		attack: 0,
		swap: 0
	});

	// Artifact state
	const identifiedArtifacts = writable<number[]>([]);
	const blockedArtifacts = writable<number[]>([]);
	const failedIdentifications = writable<number[]>([]);

	// Player identification state
	const identifiedPlayers = writable<IdentifiedPlayerResult[]>([]);

	// Game phase
	const gamePhase = writable<GamePhase>('identification');
	const selectedBeastHead = writable<number | null>(null);

	// Performed actions
	const performedActions = writable<PerformedAction[]>([]);

	// Settlement-related state
	const genuineScore = writable<number>(0);
	const finalResult = writable<{
		winner: string;
		xuYuanScore: number;
		allArtifacts: BeastHead[];
		players: Player[];
		identificationResults?: {
			laoChaoFeng?: {
				success: boolean;
				targetId: number;
				targetName?: string;
				actualName?: string;
				votes?: number;
				required?: number;
			};
			xuYuan?: {
				success: boolean;
				targetId: number;
				targetName?: string;
				actualName?: string;
				votes?: number;
				required?: number;
			};
			fangZhen?: {
				success: boolean;
				targetId: number;
				targetName?: string;
				actualName?: string;
				votes?: number;
				required?: number;
			};
		};
	} | null>(null);
	const isInIdentificationPhase = writable<boolean>(false);
	const isGameFinished = writable<boolean>(false);

	// Derived state
	const remainingSkills = derived([skillActions, usedSkills], ([$skillActions, $usedSkills]) => {
		if (!$skillActions) return null;
		return {
			checkArtifact: $skillActions.checkArtifact - $usedSkills.checkArtifact,
			checkPeople: $skillActions.checkPeople - $usedSkills.checkPeople,
			block: $skillActions.block - $usedSkills.block,
			attack: $skillActions.attack - $usedSkills.attack,
			swap: $skillActions.swap - $usedSkills.swap
		};
	});

	const hasActualSkills = derived(skillActions, ($skillActions) => {
		return $skillActions
			? $skillActions.checkPeople > 0 ||
					$skillActions.block > 0 ||
					$skillActions.attack > 0 ||
					$skillActions.swap > 0
			: false;
	});

	return {
		// Stores
		players,
		beastHeads,
		actionedPlayers,
		currentActionPlayer,
		currentRound,
		roundPhase,
		isHost,
		currentPlayerRole,
		skillActions,
		hasLoadedSkills,
		canAction,
		usedSkills,
		identifiedArtifacts,
		blockedArtifacts,
		failedIdentifications,
		identifiedPlayers,
		gamePhase,
		selectedBeastHead,
		performedActions,
		genuineScore,
		finalResult,
		isInIdentificationPhase,
		isGameFinished,

		// Derived stores
		remainingSkills,
		hasActualSkills,

		// Helper methods
		resetSkillsForNewTurn: () => {
			usedSkills.set({
				checkArtifact: 0,
				checkPeople: 0,
				block: 0,
				attack: 0,
				swap: 0
			});
			skillActions.set(null);
			hasLoadedSkills.set(false);
			canAction.set(true);
			gamePhase.set('identification');
			selectedBeastHead.set(null);
			// identifiedPlayers.set([]);
			// identifiedArtifacts.set([]);
			// blockedArtifacts.set([]);
			// failedIdentifications.set([]);
			// performedActions.set([]);
		}
	};
}
