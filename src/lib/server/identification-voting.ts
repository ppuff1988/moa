export interface IdentificationVotingPlayer {
	playerId: number;
	roleName: string | null;
}

export interface StoredIdentificationVote {
	id?: number;
	playerId: number;
	votedLaoChaoFeng: number | null;
	votedXuYuan: number | null;
	votedFangZhen: number | null;
}

export interface IdentificationVoteValues {
	votedLaoChaoFeng: number | null;
	votedXuYuan: number | null;
	votedFangZhen: number | null;
}

type ClientVoteField = 'laoChaoFeng' | 'xuYuan' | 'fangZhen';
type StoredVoteField = keyof IdentificationVoteValues;

const XU_YUAN_CAMP_ROLES = new Set(['許愿', '黃煙煙', '方震', '木戶加奈', '姬云浮']);

const VOTE_FIELDS: Record<ClientVoteField, { storedField: StoredVoteField; label: string }> = {
	laoChaoFeng: { storedField: 'votedLaoChaoFeng', label: '老朝奉' },
	xuYuan: { storedField: 'votedXuYuan', label: '許愿' },
	fangZhen: { storedField: 'votedFangZhen', label: '方震' }
};

function requiredVoteField(roleName: string | null): ClientVoteField | null {
	if (roleName && XU_YUAN_CAMP_ROLES.has(roleName)) return 'laoChaoFeng';
	if (roleName === '老朝奉') return 'xuYuan';
	if (roleName === '藥不然') return 'fangZhen';
	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type IdentificationVoteValidation =
	| { valid: true; values: IdentificationVoteValues }
	| { valid: false; status: 400 | 403; message: string };

export function validateIdentificationVote(
	roleName: string | null,
	voterId: number,
	votes: unknown,
	activePlayerIds: ReadonlySet<number>
): IdentificationVoteValidation {
	const requiredField = requiredVoteField(roleName);
	if (!requiredField) {
		return { valid: false, status: 403, message: '您的角色沒有鑑人投票資格' };
	}

	if (!isRecord(votes)) {
		return { valid: false, status: 400, message: '投票資料格式錯誤' };
	}

	const submittedFields = Object.keys(votes);
	if (submittedFields.length !== 1 || submittedFields[0] !== requiredField) {
		return {
			valid: false,
			status: 400,
			message: `您的角色必須且只能指認${VOTE_FIELDS[requiredField].label}`
		};
	}

	const targetPlayerId = votes[requiredField];
	if (!Number.isInteger(targetPlayerId) || Number(targetPlayerId) <= 0) {
		return { valid: false, status: 400, message: '請選擇有效的指認目標' };
	}

	const targetId = Number(targetPlayerId);
	if (!activePlayerIds.has(targetId) || targetId === voterId) {
		return { valid: false, status: 400, message: '指認目標不屬於本場有效玩家' };
	}

	const values: IdentificationVoteValues = {
		votedLaoChaoFeng: null,
		votedXuYuan: null,
		votedFangZhen: null
	};
	values[VOTE_FIELDS[requiredField].storedField] = targetId;

	return { valid: true, values };
}

function isStoredVoteValid(
	player: IdentificationVotingPlayer,
	vote: StoredIdentificationVote,
	activePlayerIds: ReadonlySet<number>
): boolean {
	const requiredField = requiredVoteField(player.roleName);
	if (!requiredField) return false;

	const storedField = VOTE_FIELDS[requiredField].storedField;
	const targetId = vote[storedField];
	if (
		!Number.isInteger(targetId) ||
		targetId === player.playerId ||
		!activePlayerIds.has(targetId as number)
	) {
		return false;
	}

	return (Object.keys(VOTE_FIELDS) as ClientVoteField[]).every((field) => {
		const candidateStoredField = VOTE_FIELDS[field].storedField;
		return candidateStoredField === storedField || vote[candidateStoredField] === null;
	});
}

export function getIdentificationVotingState(
	activePlayers: IdentificationVotingPlayer[],
	votes: StoredIdentificationVote[]
) {
	const activePlayerIds = new Set(activePlayers.map((player) => player.playerId));
	const eligiblePlayers = activePlayers.filter((player) => requiredVoteField(player.roleName));
	const validVotes: StoredIdentificationVote[] = [];

	for (const player of eligiblePlayers) {
		const playerVotes = votes.filter((vote) => vote.playerId === player.playerId);
		if (playerVotes.length === 1 && isStoredVoteValid(player, playerVotes[0], activePlayerIds)) {
			validVotes.push(playerVotes[0]);
		}
	}

	return {
		votedCount: validVotes.length,
		totalEligibleVoters: eligiblePlayers.length,
		allVoted: validVotes.length === eligiblePlayers.length,
		validVotes
	};
}
