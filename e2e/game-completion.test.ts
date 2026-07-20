import { expect, test, type APIResponse, type BrowserContext, type Page } from '@playwright/test';
import { createTestUser, createTestUsersInDatabase, type TestUser } from './helpers';

interface Participant extends TestUser {
	page: Page;
	userId: number;
	playerId: number;
	roleName: string;
}

interface GamePlayer {
	id: number;
	userId: number;
	nickname: string;
	roleName: string | null;
	isHost: boolean;
	isCurrentAction: boolean;
}

interface PlayersResponse {
	players: GamePlayer[];
	currentRound: { round: number; phase: string } | null;
	currentActionPlayer: { id: number; nickname: string; roleName: string | null } | null;
}

interface Artifact {
	id: number;
	animal: string;
}

async function responseJson<T>(
	response: APIResponse,
	expectedStatus: number,
	label: string
): Promise<T> {
	const body = await response.text();
	expect(response.status(), `${label}: ${body}`).toBe(expectedStatus);
	return JSON.parse(body) as T;
}

async function getJson<T>(page: Page, path: string, expectedStatus = 200): Promise<T> {
	return responseJson<T>(await page.request.get(path), expectedStatus, `GET ${path}`);
}

async function postJson<T>(
	page: Page,
	path: string,
	data: Record<string, unknown> = {},
	expectedStatus = 200
): Promise<T> {
	return responseJson<T>(await page.request.post(path, { data }), expectedStatus, `POST ${path}`);
}

test('8 人遊戲完成三輪、鑑人並向所有玩家顯示最終結果', async ({ browser }) => {
	test.setTimeout(300_000);

	const timestamp = Date.now();
	const users = Array.from({ length: 8 }, (_, index) =>
		createTestUser(`completion_${index}`, timestamp + index)
	);
	const contexts: BrowserContext[] = await Promise.all(users.map(() => browser.newContext()));
	const pages = await Promise.all(contexts.map((context) => context.newPage()));
	const participants: Participant[] = users.map((user, index) => ({
		...user,
		page: pages[index],
		userId: 0,
		playerId: 0,
		roleName: ''
	}));
	let roomName: string | undefined;

	try {
		await createTestUsersInDatabase(pages[0], users);

		for (const participant of participants) {
			const login = await postJson<{ user: { id: number } }>(participant.page, '/api/auth/login', {
				email: participant.username,
				password: participant.password
			});
			participant.userId = login.user.id;
		}

		const created = await postJson<{ roomName: string }>(
			participants[0].page,
			'/api/room/create',
			{ password: 'completion-room' },
			201
		);
		roomName = created.roomName;

		for (const participant of participants.slice(1)) {
			await postJson(participant.page, '/api/room/join', {
				roomName,
				password: 'completion-room'
			});
		}

		await postJson(participants[0].page, `/api/room/${roomName}/start-selection`);
		const rolePayload = await getJson<{
			roles: Array<{ id: number; name: string }>;
		}>(participants[0].page, '/api/roles?playerCount=8');
		expect(rolePayload.roles).toHaveLength(8);

		const colors = ['紅', '橙', '黃', '綠', '藍', '紫', '黑', '白'];
		for (let index = 0; index < participants.length; index++) {
			await postJson(participants[index].page, `/api/room/${roomName}/lock-role`, {
				roleId: rolePayload.roles[index].id,
				color: colors[index]
			});
			participants[index].roleName = rolePayload.roles[index].name;
		}

		const started = await postJson<{ round: number }>(
			participants[0].page,
			`/api/room/${roomName}/start`
		);
		expect(started.round).toBe(1);

		const initialPlayers = await getJson<PlayersResponse>(
			participants[0].page,
			`/api/room/${roomName}/players`
		);
		expect(initialPlayers.players).toHaveLength(8);
		for (const participant of participants) {
			const player = initialPlayers.players.find(
				(candidate) => candidate.userId === participant.userId
			);
			expect(player, `找不到 ${participant.nickname} 的 game player`).toBeDefined();
			participant.playerId = player!.id;
			participant.roleName = player!.roleName ?? participant.roleName;
		}

		const participantByPlayerId = new Map(
			participants.map((participant) => [participant.playerId, participant])
		);

		for (let round = 1; round <= 3; round++) {
			const artifactPayload = await getJson<{
				artifacts: Artifact[];
				currentRound: number;
			}>(participants[0].page, `/api/room/${roomName}/artifacts`);
			expect(artifactPayload.currentRound).toBe(round);
			expect(artifactPayload.artifacts).toHaveLength(4);

			const truthByArtifactId = new Map<number, boolean>();
			const actedPlayerIds = new Set<number>();

			for (let turn = 0; turn < participants.length; turn++) {
				const state = await getJson<PlayersResponse>(
					participants[0].page,
					`/api/room/${roomName}/players`
				);
				expect(state.currentRound).toEqual({ round, phase: 'action' });
				expect(state.currentActionPlayer).not.toBeNull();

				const currentPlayerId = state.currentActionPlayer!.id;
				expect(actedPlayerIds.has(currentPlayerId), '同一玩家不應在同回合重複行動').toBe(false);
				const currentParticipant = participantByPlayerId.get(currentPlayerId);
				expect(currentParticipant).toBeDefined();

				const target =
					artifactPayload.artifacts.find((artifact) => !truthByArtifactId.has(artifact.id)) ??
					artifactPayload.artifacts[turn % artifactPayload.artifacts.length];
				const identifyResponse = await currentParticipant!.page.request.post(
					`/api/room/${roomName}/identify-artifact`,
					{ data: { artifactName: `${target.animal}首` } }
				);
				const identifyBody = (await identifyResponse.json()) as {
					message: string;
					actionRecorded?: boolean;
					result?: { isGenuine: boolean };
				};

				if (identifyResponse.status() === 200) {
					expect(identifyBody.result).toBeDefined();
					truthByArtifactId.set(target.id, identifyBody.result!.isGenuine);
				} else if (currentParticipant!.roleName === '方震') {
					expect(identifyResponse.status(), identifyBody.message).toBe(400);
					expect(identifyBody.message).toBe('你已經用完所有鑑定次數');
				} else {
					expect(identifyResponse.status(), identifyBody.message).toBe(403);
					expect(identifyBody.actionRecorded).toBe(true);
				}

				actedPlayerIds.add(currentPlayerId);
				if (turn < participants.length - 1) {
					const nextPlayer = state.players.find(
						(player) => !actedPlayerIds.has(player.id) && player.id !== currentPlayerId
					);
					expect(nextPlayer).toBeDefined();
					await postJson(currentParticipant!.page, `/api/room/${roomName}/next-player`, {
						nextPlayerId: nextPlayer!.id
					});
				} else {
					await postJson(currentParticipant!.page, `/api/room/${roomName}/start-discussion`);
				}
			}

			expect(actedPlayerIds.size).toBe(8);
			expect(truthByArtifactId.size, `第 ${round} 回合應鑑定出全部四個獸首`).toBe(4);
			const discussionState = await getJson<{ phase: string; round: number }>(
				participants[0].page,
				`/api/room/${roomName}/round-status`
			);
			expect(discussionState).toMatchObject({ phase: 'discussion', round });

			await postJson(participants[0].page, `/api/room/${roomName}/start-voting`);
			const fakeArtifact = artifactPayload.artifacts.find(
				(artifact) => truthByArtifactId.get(artifact.id) === false
			);
			const secondArtifact = artifactPayload.artifacts.find(
				(artifact) => artifact.id !== fakeArtifact?.id
			);
			expect(fakeArtifact, `第 ${round} 回合應找到贗品`).toBeDefined();
			expect(secondArtifact).toBeDefined();

			const submitted = await postJson<{
				votingResult: {
					round: number;
					firstPlace: { id: number };
					secondPlace: { id: number };
				};
			}>(participants[0].page, `/api/room/${roomName}/submit-votes`, {
				votes: {
					[fakeArtifact!.id]: 2,
					[secondArtifact!.id]: 1
				}
			});
			expect(submitted.votingResult).toMatchObject({
				round,
				firstPlace: { id: fakeArtifact!.id },
				secondPlace: { id: secondArtifact!.id }
			});

			const resultState = await getJson<{
				phase: string;
				round: number;
				votingResult: { firstPlace: { id: number } };
			}>(participants[0].page, `/api/room/${roomName}/round-status`);
			expect(resultState).toMatchObject({
				phase: 'result',
				round,
				votingResult: { firstPlace: { id: fakeArtifact!.id } }
			});

			if (round < 3) {
				const nextRound = await postJson<{ round: number }>(
					participants[0].page,
					`/api/room/${roomName}/start`,
					{ round: round + 1 }
				);
				expect(nextRound.round).toBe(round + 1);
			}
		}

		const gameUrl = `/room/${roomName}/game`;
		await participants[0].page.goto(gameUrl);
		await expect(participants[0].page.locator('.voting-result-panel')).toBeVisible();

		const [settlementResponse] = await Promise.all([
			participants[0].page.waitForResponse(
				(response) =>
					response.url().endsWith(`/api/room/${roomName}/calculate-settlement`) &&
					response.request().method() === 'POST'
			),
			participants[0].page.locator('button.settlement-btn').click()
		]);
		const settlement = await responseJson<{ needIdentification: boolean }>(
			settlementResponse,
			200,
			'calculate settlement'
		);
		expect(settlement.needIdentification).toBe(true);
		await expect(participants[0].page.locator('.identification-phase')).toBeVisible();

		const players = (
			await getJson<PlayersResponse>(participants[0].page, `/api/room/${roomName}/players`)
		).players;
		const playerByRole = new Map(players.map((player) => [player.roleName, player]));
		const voteFieldByRole = new Map<string, 'laoChaoFeng' | 'xuYuan' | 'fangZhen'>([
			['許愿', 'laoChaoFeng'],
			['黃煙煙', 'laoChaoFeng'],
			['方震', 'laoChaoFeng'],
			['木戶加奈', 'laoChaoFeng'],
			['姬云浮', 'laoChaoFeng'],
			['老朝奉', 'xuYuan'],
			['藥不然', 'fangZhen']
		]);
		const targetRoleByField = {
			laoChaoFeng: '老朝奉',
			xuYuan: '許愿',
			fangZhen: '方震'
		} as const;

		let votedCount = 0;
		for (const participant of participants) {
			const field = voteFieldByRole.get(participant.roleName);
			if (!field) continue;
			const target = playerByRole.get(targetRoleByField[field]);
			expect(target).toBeDefined();
			const submittedVote = await postJson<{
				votedCount: number;
				totalEligibleVoters: number;
			}>(participant.page, `/api/room/${roomName}/submit-identification`, {
				votes: { [field]: target!.id }
			});
			votedCount++;
			expect(submittedVote).toMatchObject({ votedCount, totalEligibleVoters: 7 });
		}
		expect(votedCount).toBe(7);

		const identificationStatus = await getJson<{
			votedCount: number;
			totalEligibleVoters: number;
			allVoted: boolean;
		}>(participants[0].page, `/api/room/${roomName}/identification-status`);
		expect(identificationStatus).toMatchObject({
			votedCount: 7,
			totalEligibleVoters: 7,
			allVoted: true
		});

		await expect(participants[0].page.locator('button.publish-btn')).toBeVisible();
		const [publishResponse] = await Promise.all([
			participants[0].page.waitForResponse(
				(response) =>
					response.url().endsWith(`/api/room/${roomName}/publish-identification`) &&
					response.request().method() === 'POST'
			),
			participants[0].page.locator('button.publish-btn').click()
		]);
		await responseJson(publishResponse, 200, 'publish identification');

		const finalResult = await getJson<{
			success: boolean;
			winner: string;
			xuYuanScore: number;
			allArtifacts: Array<{ round: number; voteRank: number }>;
			players: unknown[];
			identificationResults: Record<string, unknown>;
		}>(participants[0].page, `/api/room/${roomName}/final-result`);
		expect(finalResult.success).toBe(true);
		expect(finalResult.players).toHaveLength(8);
		expect(finalResult.allArtifacts).toHaveLength(6);
		expect(new Set(finalResult.allArtifacts.map((artifact) => artifact.round))).toEqual(
			new Set([1, 2, 3])
		);
		expect(finalResult.identificationResults).toMatchObject({
			laoChaoFeng: { success: true },
			xuYuan: { success: true },
			fangZhen: { success: true }
		});

		for (const participant of participants) {
			await participant.page.goto(gameUrl);
			const page = participant.page;
			await expect(page.locator('.final-result-panel')).toBeVisible();
			await expect(page.locator('.winner-title')).toContainText(finalResult.winner);
			await expect(page.locator('.round-card')).toHaveCount(3);
			await expect(page.locator('.artifact-item')).toHaveCount(6);
			await expect(page.getByText('鑑人階段結果')).toBeVisible();
		}
	} finally {
		if (roomName) {
			for (const participant of participants) {
				await participant.page.request.post(`/api/room/${roomName}/leave`).catch(() => undefined);
			}
		}
		await Promise.all(contexts.map((context) => context.close().catch(() => undefined)));
	}
});
