<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { getJWTToken } from '$lib/utils/jwt';
	import { addNotification, currentGameStatus } from '$lib/stores/notifications';
	import { GameService } from '$lib/services/gameService';
	import { createGameState } from '$lib/stores/gameState';
	import { initSocket, disconnectSocket } from '$lib/utils/socket';
	import type { Socket } from 'socket.io-client';

	// Components
	import NotificationManager from '$lib/components/notification/NotificationManager.svelte';
	import ActionSequence from '$lib/components/ui/ActionSequence.svelte';
	import PlayerOrderDisplay from '$lib/components/player/PlayerOrderDisplay.svelte';
	import ArtifactDisplay from '$lib/components/ui/ArtifactDisplay.svelte';
	import VotingPanel from '$lib/components/ui/VotingPanel.svelte';
	import VotingResultPanel from '$lib/components/ui/VotingResultPanel.svelte';
	import GameHeader from '$lib/components/game/GameHeader.svelte';
	import PhaseIndicator from '$lib/components/game/PhaseIndicator.svelte';
	import IdentificationPhase from '$lib/components/game/IdentificationPhase.svelte';
	import SkillPhase from '$lib/components/game/SkillPhase.svelte';
	import AssignPhase from '$lib/components/game/AssignPhase.svelte';
	import IdentificationPhasePanel from '$lib/components/game/IdentificationPhasePanel.svelte';
	import FinalResultPanel from '$lib/components/game/FinalResultPanel.svelte';

	import type { User, ActionedPlayer } from '$lib/types/game';

	// Game state
	const gameState = createGameState();
	const {
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
		usedSkills,
		identifiedArtifacts,
		blockedArtifacts,
		failedIdentifications,
		identifiedPlayers,
		gamePhase,
		selectedBeastHead,
		performedActions,
		remainingSkills,
		hasActualSkills,
		genuineScore,
		finalResult,
		isGameFinished
	} = gameState;

	let currentUser: User | null = null;
	let isLoading = true;
	let gameStatus: string = 'playing';
	let updateInterval: number;
	let isActionHistoryOpen = false;
	let gameService: GameService;
	let socket: Socket | null = null;
	let teammateInfo: { roleName: string; nickname: string; colorCode: string } | null = null;

	$: roomName = $page.params.name || '';
	$: isMyTurn =
		$currentActionPlayer?.id === $players.find((p) => p.nickname === currentUser?.nickname)?.id;
	$: currentUserId = $players.find((p) => p.nickname === currentUser?.nickname)?.id;
	$: assignablePlayers = $players.filter((player) => {
		if (player.id === $currentActionPlayer?.id) return false;
		const hasActed = $actionedPlayers.some((ap) => ap.id === player.id);
		return !hasActed;
	});
	$: attackablePlayers = $players.filter((player) => player.id !== currentUserId);

	// Update gameStatus based on roundPhase
	$: gameStatus = $roundPhase === 'finished' ? 'finished' : 'playing';

	// 同步遊戲狀態到通知系統
	$: currentGameStatus.set(gameStatus);

	// Initialize game service
	$: if (roomName) {
		gameService = new GameService(roomName);
	}

	// ==================== Data Fetching ====================

	async function fetchArtifacts() {
		const artifacts = await gameService.fetchArtifacts();
		if (artifacts.length > 0) {
			beastHeads.set(artifacts);
		}
	}

	async function fetchMyRole() {
		if ($hasLoadedSkills) return;

		const {
			roleName,
			skillActions: skills,
			performedActions: actions
		} = await gameService.fetchMyRole();

		if (roleName) {
			currentPlayerRole.set(roleName);
			// 獲取角色後，立即獲取隊友資訊
			await fetchTeammateInfo();
		}

		if (skills) {
			skillActions.set(skills);
			hasLoadedSkills.set(true);
		}

		if (actions && actions.length > 0) {
			performedActions.set(actions);
		}
	}

	async function updatePlayersAndRound() {
		const data = await gameService.updatePlayersAndRound();
		if (!data) return;

		if (data.players) {
			players.set(data.players);
		}

		if (data.currentRound) {
			currentRound.set(data.currentRound.round);
		}

		if (data.actionedPlayers && Array.isArray(data.actionedPlayers)) {
			const uniquePlayersMap = new SvelteMap<number, ActionedPlayer>();
			data.actionedPlayers.forEach((player: ActionedPlayer) => {
				uniquePlayersMap.set(player.id, player);
			});
			actionedPlayers.set(Array.from(uniquePlayersMap.values()));
		} else {
			actionedPlayers.set([]);
		}

		currentActionPlayer.set(data.currentActionPlayer || null);

		if (isMyTurn && !$hasLoadedSkills) {
			await fetchMyRole();
		}
	}

	async function fetchRoundStatus() {
		// 如果遊戲已結束，不再更新狀態
		if ($isGameFinished) return;

		const data = await gameService.fetchRoundStatus();
		if (!data) return;

		if (data.phase) {
			roundPhase.set(data.phase);
			// 如果 API 返回 finished，設置遊戲結束標記
			if (data.phase === 'finished') {
				isGameFinished.set(true);
			}
		}
		if (data.isHost !== undefined) {
			isHost.set(data.isHost);
		}
	}

	async function fetchTeammateInfo() {
		const token = getJWTToken();
		if (!token) return;

		try {
			const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/teammate-info`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (response.ok) {
				const data = await response.json();

				if (data.success && data.hasTeammate && data.teammate) {
					teammateInfo = data.teammate;
				}
			}
		} catch (error) {
			console.error('獲取隊友信息錯誤:', error);
		}
	}

	// ==================== State Restoration ====================

	function restoreUsedSkills() {
		if ($performedActions.length === 0) return;

		usedSkills.set({
			checkArtifact: 0,
			checkPeople: 0,
			block: 0,
			attack: 0,
			swap: 0
		});

		identifiedPlayers.set([]);

		$performedActions.forEach((action) => {
			switch (action.type) {
				case 'identify_artifact':
					usedSkills.update((s) => ({ ...s, checkArtifact: s.checkArtifact + 1 }));
					break;
				case 'identify_player':
					usedSkills.update((s) => ({ ...s, checkPeople: s.checkPeople + 1 }));
					if (!action.data.blocked && action.data.camp) {
						identifiedPlayers.update((list) => [
							...list,
							{
								playerId: action.data.targetPlayerId as number,
								nickname: action.data.targetPlayerNickname as string,
								camp: action.data.camp as string
							}
						]);
					}
					break;
				case 'block_artifact':
					usedSkills.update((s) => ({ ...s, block: s.block + 1 }));
					break;
				case 'attack_player':
					usedSkills.update((s) => ({ ...s, attack: s.attack + 1 }));
					break;
				case 'swap_artifacts':
					usedSkills.update((s) => ({ ...s, swap: s.swap + 1 }));
					break;
			}
		});
	}

	function restoreIdentifiedState() {
		const hasUsedSkills = $performedActions.some(
			(action) =>
				action.type === 'identify_player' ||
				action.type === 'block_artifact' ||
				action.type === 'attack_player' ||
				action.type === 'swap_artifacts'
		);

		const identifyActions = $performedActions.filter(
			(action) => action.type === 'identify_artifact'
		);

		if (identifyActions.length > 0 && $beastHeads.length > 0) {
			let successfulCount = 0;
			let blockedCount = 0;

			identifyActions.forEach((identifyAction) => {
				if (identifyAction.data) {
					const artifactName = (identifyAction.data.artifactName as string)?.replace('首', '');
					const identifiedBeast = $beastHeads.find((b) => b.animal === artifactName);

					if (identifiedBeast) {
						const isBlocked = identifyAction.data.blocked === true;

						if (isBlocked) {
							if (!$failedIdentifications.includes(identifiedBeast.id)) {
								failedIdentifications.update((list) => [...list, identifiedBeast.id]);
								blockedCount++;
							}
						} else {
							if (!$identifiedArtifacts.includes(identifiedBeast.id)) {
								identifiedArtifacts.update((list) => [...list, identifiedBeast.id]);
								successfulCount++;

								beastHeads.update((heads) => {
									const index = heads.findIndex((b) => b.id === identifiedBeast.id);
									if (index !== -1) {
										heads[index] = {
											...heads[index],
											isGenuine: identifyAction.data.result as boolean
										};
									}
									return [...heads];
								});
							}
						}
					}
				}
			});

			if (successfulCount > 0 && blockedCount > 0) {
				addNotification(
					`已恢復 ${successfulCount} 個鑑定結果和 ${blockedCount} 個被封鎖的鑑定`,
					'info',
					3000
				);
			} else if (successfulCount > 0) {
				addNotification(`已恢復 ${successfulCount} 個鑑定結果`, 'info', 3000);
			} else if (blockedCount > 0) {
				addNotification(`已恢復 ${blockedCount} 個被封鎖的鑑定`, 'info', 3000);
			}
		}

		if ($identifiedPlayers.length > 0) {
			addNotification(`已恢復 ${$identifiedPlayers.length} 位玩家的鑑定資訊`, 'info', 3000);
		}

		if (hasUsedSkills) {
			gamePhase.set('assign-next');
			addNotification('請指派下一位玩家', 'info', 3000);
		} else if (identifyActions.length > 0) {
			if ($hasActualSkills) {
				gamePhase.set('skill');
			} else {
				gamePhase.set('assign-next');
				addNotification('請指派下一位玩家', 'info', 3000);
			}
		} else if ($skillActions && $skillActions.checkArtifact === 0) {
			gamePhase.set('skill');
		}
	}

	// ==================== Game Actions ====================

	async function identifyBeastHead(beastId: number) {
		if (!isMyTurn || $gamePhase !== 'identification') return;
		if (!$skillActions || $skillActions.checkArtifact === 0) {
			addNotification('你的角色無法鑑定獸首', 'error');
			return;
		}

		if ($usedSkills.checkArtifact >= $skillActions.checkArtifact) {
			addNotification('你已經用完所有鑑定次數', 'warning');
			return;
		}

		const beast = $beastHeads.find((b) => b.id === beastId);
		if (!beast || $blockedArtifacts.includes(beastId)) {
			addNotification('此獸首無法鑑定', 'error');
			return;
		}

		try {
			const { ok, data } = await gameService.identifyArtifact(`${beast.animal}首`);

			if (ok) {
				identifiedArtifacts.update((list) => [...list, beastId]);
				usedSkills.update((s) => ({ ...s, checkArtifact: s.checkArtifact + 1 }));

				beastHeads.update((heads) => {
					const index = heads.findIndex((b) => b.id === beastId);
					if (index !== -1 && data.result) {
						heads[index] = { ...heads[index], isGenuine: data.result.isGenuine };
					}
					return [...heads];
				});

				addNotification(
					`你鑑定了${beast.animal}首，結果：${data.result.isGenuine ? '真品' : '贗品'}`,
					data.result.isGenuine ? 'success' : 'info',
					4000
				);

				if ($usedSkills.checkArtifact >= $skillActions.checkArtifact) {
					setTimeout(() => {
						if (!$hasActualSkills) {
							gamePhase.set('assign-next');
							addNotification('你沒有可用的技能，請指派下一位玩家', 'info', 3000);
							updatePlayersAndRound();
						} else {
							gamePhase.set('skill');
						}
					}, 1500);
				} else {
					addNotification(
						`你還可以再鑑定 ${$skillActions.checkArtifact - $usedSkills.checkArtifact} 次`,
						'info',
						3000
					);
				}
			} else {
				failedIdentifications.update((list) => [...list, beastId]);
				usedSkills.update((s) => ({ ...s, checkArtifact: s.checkArtifact + 1 }));
				addNotification(`${beast.animal}首無法鑑定`, 'warning', 3000);

				if ($usedSkills.checkArtifact >= $skillActions.checkArtifact) {
					setTimeout(() => {
						if (!$hasActualSkills) {
							gamePhase.set('assign-next');
							addNotification('你沒有可用的技能，請指派下一位玩家', 'info', 3000);
							updatePlayersAndRound();
						} else {
							gamePhase.set('skill');
						}
					}, 1500);
				} else {
					addNotification(
						`你還可以再鑑定 ${$skillActions.checkArtifact - $usedSkills.checkArtifact} 次`,
						'info',
						3000
					);
				}
			}
		} catch (error) {
			console.error('鑑定獸首錯誤:', error);
			addNotification('鑑定獸首失敗，請檢查網路連接', 'error');
		}
	}

	async function checkPlayer(playerId: number | string) {
		if (!$remainingSkills || $remainingSkills.checkPeople <= 0) {
			addNotification('你沒有剩餘的鑑人次數', 'error');
			return;
		}

		const targetPlayer = $players.find((p) => p.id === playerId);
		if (!targetPlayer) return;

		const alreadyIdentified = $identifiedPlayers.find((ip) => ip.playerId === playerId);
		if (alreadyIdentified) {
			addNotification(
				`你已經鑑定過 ${targetPlayer.nickname}，陣營：${alreadyIdentified.camp}`,
				'info',
				4000
			);
			return;
		}

		try {
			const { ok, data } = await gameService.identifyPlayer(Number(playerId));

			if (ok) {
				usedSkills.update((s) => ({ ...s, checkPeople: s.checkPeople + 1 }));

				identifiedPlayers.update((list) => [
					...list,
					{
						playerId: data.result.targetPlayerId,
						nickname: data.result.targetPlayerNickname,
						camp: data.result.camp
					}
				]);

				performedActions.update((list) => [
					...list,
					{
						type: 'identify_player',
						data: {
							targetPlayerId: playerId,
							targetPlayerNickname: targetPlayer.nickname,
							camp: data.result.camp
						}
					}
				]);

				const campText =
					data.result.camp === 'good'
						? '許愿陣營'
						: data.result.camp === 'bad'
							? '老朝奉陣營'
							: data.result.camp;
				addNotification(
					`你鑑定了 ${targetPlayer.nickname}，陣營：${campText}`,
					data.result.camp === 'good' ? 'success' : 'warning',
					5000
				);
			} else {
				if (data.blocked) {
					usedSkills.update((s) => ({ ...s, checkPeople: s.checkPeople + 1 }));
					addNotification(data.message || '無法鑑定此玩家', 'warning', 3000);

					performedActions.update((list) => [
						...list,
						{
							type: 'identify_player',
							data: {
								targetPlayerId: playerId,
								targetPlayerNickname: targetPlayer.nickname,
								blocked: true
							}
						}
					]);
				} else {
					addNotification(data.message || '鑑定失敗', 'error');
				}
			}
		} catch (error) {
			console.error('鑑定玩家錯誤:', error);
			addNotification('鑑定玩家失敗，請檢查網路連接', 'error');
		}
	}

	async function blockArtifact(beastId: number) {
		if (!$remainingSkills || $remainingSkills.block <= 0) {
			addNotification('你沒有剩餘的封鎖次數', 'error');
			return;
		}

		const beast = $beastHeads.find((b) => b.id === beastId);
		if (!beast) return;

		try {
			const { ok, data } = await gameService.blockArtifact(beastId);

			if (ok) {
				blockedArtifacts.update((list) => [...list, beastId]);
				usedSkills.update((s) => ({ ...s, block: s.block + 1 }));
				addNotification(data.message || `成功封鎖 ${beast.animal}首`, 'success');

				performedActions.update((list) => [
					...list,
					{
						type: 'block_artifact',
						data: { artifactId: beastId, artifactName: `${beast.animal}首` }
					}
				]);

				await fetchArtifacts();
			} else {
				addNotification(data.message || '封鎖獸首失敗', 'error');
			}
		} catch (error) {
			console.error('封鎖獸首錯誤:', error);
			addNotification('封鎖獸首失敗，請檢查網路連接', 'error');
		}
	}

	async function attackPlayer(playerId: number | string) {
		if (!$remainingSkills || $remainingSkills.attack <= 0) {
			addNotification('你沒有剩餘的攻擊次數', 'error');
			return;
		}

		const targetPlayer = $players.find((p) => p.id === playerId);
		if (!targetPlayer) return;

		try {
			const { ok, data } = await gameService.attackPlayer(Number(playerId));

			if (ok) {
				usedSkills.update((s) => ({ ...s, attack: s.attack + 1 }));
				addNotification(data.message || `成功攻擊 ${targetPlayer.nickname}`, 'success');

				performedActions.update((list) => [
					...list,
					{
						type: 'attack_player',
						data: {
							targetPlayerId: playerId,
							targetPlayerNickname: targetPlayer.nickname,
							blockedRound: data.blockedRound
						}
					}
				]);
			} else {
				addNotification(data.message || '攻擊失敗', 'error');
			}
		} catch (error) {
			console.error('攻擊玩家錯誤:', error);
			addNotification('攻擊玩家失敗，請檢查網路連接', 'error');
		}
	}

	async function swapArtifact() {
		if (!$remainingSkills || $remainingSkills.swap <= 0) {
			addNotification('你沒有剩餘的交換次數', 'error');
			return;
		}

		try {
			const { ok, data } = await gameService.swapArtifacts();

			if (ok) {
				usedSkills.update((s) => ({ ...s, swap: s.swap + 1 }));
				addNotification(data.message || '交換真偽成功', 'success');

				performedActions.update((list) => [
					...list,
					{
						type: 'swap_artifacts',
						data: { swappedArtifacts: data.swappedArtifacts }
					}
				]);
			} else {
				addNotification(data.message || '交換真偽失敗', 'error');
			}
		} catch (error) {
			console.error('交換真偽錯誤:', error);
			addNotification('交換真偽失敗，請檢查網路連接', 'error');
		}
	}

	async function finishSkillPhase() {
		gamePhase.set('assign-next');
		selectedBeastHead.set(null);
		await updatePlayersAndRound();
	}

	async function assignNextPlayer(playerId: number | string) {
		if (!isMyTurn || $gamePhase !== 'assign-next') return;

		const nextPlayer = $players.find((p) => p.id === playerId);
		if (!nextPlayer) return;

		try {
			const { ok, data } = await gameService.assignNextPlayer(Number(playerId));

			if (ok) {
				addNotification(`你指派了 ${nextPlayer.nickname} 作為下一位玩家`, 'success');
				gameState.resetSkillsForNewTurn();
				await updatePlayersAndRound();
			} else {
				addNotification(data.message || '指派下一位玩家失敗', 'error');
			}
		} catch (error) {
			console.error('指派下一位玩家錯誤:', error);
			addNotification('指派下一位玩家失敗，請檢查網路連接', 'error');
		}
	}

	async function enterDiscussion() {
		try {
			const { ok, data } = await gameService.startDiscussion();

			if (ok) {
				addNotification('已進入討論階段', 'success');
				roundPhase.set('discussion');
				await fetchRoundStatus();
			} else {
				addNotification(data.message || '進入討論階段失敗', 'error');
			}
		} catch (error) {
			console.error('進入討論階段錯誤:', error);
			addNotification('進入討論階段失敗，請檢查網路連接', 'error');
		}
	}

	async function startVoting() {
		try {
			const { ok, data } = await gameService.startVoting();

			if (ok) {
				addNotification('投票階段已開始', 'success');
				roundPhase.set('voting');
			} else {
				addNotification(data.message || '開始投票失敗', 'error');
			}
		} catch (error) {
			console.error('開始投票錯誤:', error);
			addNotification('開始投票失敗，請檢查網路連接', 'error');
		}
	}

	// ==================== Lifecycle ====================

	onMount(async () => {
		// 檢查用戶是否已登入
		const token = getJWTToken();
		if (!token) {
			// 未登入，重定向到登入頁
			goto('/auth/login', { invalidateAll: true });
			return;
		}

		try {
			const userResponse = await fetch('/api/user/profile', {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (userResponse.ok) {
				currentUser = await userResponse.json();
			} else {
				goto('/auth/login', { invalidateAll: true });
				return;
			}

			const roomResponse = await fetch(`/api/room/${encodeURIComponent(roomName)}`, {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (roomResponse.ok) {
				const roomData = await roomResponse.json();
				gameStatus = roomData.game?.status || 'playing';

				// 如果遊戲狀態是 waiting 或 selecting，導向到 lobby 頁面
				if (gameStatus === 'waiting' || gameStatus === 'selecting') {
					goto(`/room/${encodeURIComponent(roomName)}/lobby`, { replaceState: true });
					return;
				}

				// 如果遊戲已結束，獲取最終結果並顯示
				if (gameStatus === 'finished') {
					const finalResultData = await gameService.fetchFinalResult();
					if (finalResultData && finalResultData.success) {
						finalResult.set(finalResultData);
						roundPhase.set('finished');
						isGameFinished.set(true);
						addNotification(`遊戲已結束！${finalResultData.winner}獲勝！`, 'info', 5000);
					}
				} else {
					// 遊戲進行中，正常載入遊戲資料
					await updatePlayersAndRound();
					await fetchRoundStatus();
					await fetchArtifacts();
					await fetchMyRole();
					await fetchTeammateInfo();
					restoreUsedSkills();
					restoreIdentifiedState();
				}

				addNotification(`進入遊戲！房間：${roomName}`, 'success', 3000);

				// Initialize socket connection
				try {
					socket = initSocket();

					// Join the game room
					socket.emit('join-room', roomName);

					// Listen for voting-completed event
					socket.on('voting-completed', async (data) => {
						console.log('[📥 voting-completed] 收到投票完成廣播', {
							phase: data.phase,
							roundId: data.roundId,
							round: data.round
						});
						addNotification('投票結果已公布', 'info', 3000);

						// Update phase to result
						if (data.phase) {
							roundPhase.set(data.phase);
							console.log('[📥 voting-completed] 更新階段為:', data.phase);
						}

						// Refresh artifacts to get voting results
						await fetchArtifacts();
						await fetchRoundStatus();
					});

					// Listen for round-started event
					socket.on('round-started', async (data) => {
						console.log('[📥 round-started] 收到新回合開始廣播', {
							round: data.round,
							roundId: data.roundId,
							firstPlayerId: data.firstPlayerId,
							previousRoundCompleted: data.previousRoundCompleted
						});
						addNotification(`第 ${data.round} 回合已開始`, 'success', 3000);

						// Update current round
						if (data.round) {
							currentRound.set(data.round);
							console.log('[📥 round-started] 更新當前回合為:', data.round);
						}

						// Reset game state for new round
						gameState.resetSkillsForNewTurn();

						// Refresh all game data
						await fetchArtifacts();
						await updatePlayersAndRound();
						await fetchRoundStatus();
						await fetchMyRole();
					});

					// Listen for enter-identification-phase event
					socket.on('enter-identification-phase', async (data) => {
						console.log('[📥 enter-identification-phase] 收到進入鑑人階段廣播', {
							message: data.message,
							genuineCount: data.genuineCount,
							roundId: data.roundId
						});
						addNotification(data.message || '進入鑑人階段', 'info', 4000);

						// Update phase and score
						roundPhase.set('identification');
						genuineScore.set(data.genuineCount || 0);
						console.log(
							'[📥 enter-identification-phase] 更新階段為 identification，真品數量:',
							data.genuineCount
						);

						// Refresh data
						await fetchRoundStatus();
					});

					// Listen for identification-completed event
					socket.on('identification-completed', async (data) => {
						console.log('[📥 identification-completed] 收到鑑人完成廣播', {
							winner: data.winner,
							goodTeamScore: data.goodTeamScore,
							badTeamScore: data.badTeamScore,
							finalResult: data
						});
						addNotification(`遊戲結束！${data.winner}獲勝！`, 'success', 5000);

						// Update final result
						finalResult.set(data);
						roundPhase.set('finished');
						isGameFinished.set(true);
						console.log('[📥 identification-completed] 遊戲結束，勝利方:', data.winner);

						// Refresh data
						await fetchRoundStatus();
					});

					// Listen for game-finished event
					socket.on('game-finished', async (data) => {
						console.log('[📥 game-finished] 收到遊戲結束廣播', {
							winner: data.winner,
							goodTeamScore: data.goodTeamScore,
							badTeamScore: data.badTeamScore,
							finalResult: data
						});
						addNotification(`遊戲結束！${data.winner}獲勝！`, 'success', 5000);

						// Update final result
						finalResult.set(data);
						roundPhase.set('finished');
						isGameFinished.set(true);
						console.log('[📥 game-finished] 遊戲結束，勝利方:', data.winner);

						// Refresh data
						await fetchRoundStatus();
					});

					console.log('Socket 已初始化並加入房間:', roomName);
				} catch (socketError) {
					console.error('Socket 初始化錯誤:', socketError);
					// 不要因為 socket 錯誤而阻止遊戲載入
				}

				updateInterval = window.setInterval(() => {
					updatePlayersAndRound();
					fetchRoundStatus();
					// 移除 fetchArtifacts() - 獸首資料只在特定事件時更新，不需要輪詢
				}, 3000);
			} else {
				const error = await roomResponse.json().catch(() => ({ message: '載入房間失敗' }));
				addNotification(error.message || '載入房間失敗', 'error');
				setTimeout(() => {
					window.location.href = '/';
				}, 2000);
				return;
			}
		} catch (error) {
			console.error('載入遊戲錯誤:', error);
			addNotification('載入遊戲失敗，請檢查網路連接', 'error');
			setTimeout(() => {
				window.location.href = '/';
			}, 2000);
		} finally {
			isLoading = false;
		}
	});

	onDestroy(() => {
		if (updateInterval) {
			clearInterval(updateInterval);
		}
		if (socket) {
			socket.emit('leave-room');
			disconnectSocket();
		}
	});
</script>

<svelte:head>
	<title>遊戲中 - {roomName} - 古董局中局</title>
</svelte:head>

{#if isLoading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>載入遊戲中...</p>
	</div>
{:else}
	<div class="game-container">
		<GameHeader
			{roomName}
			currentUserNickname={currentUser?.nickname}
			currentPlayerRole={$currentPlayerRole}
			{teammateInfo}
			{gameStatus}
			onOpenHistory={() => (isActionHistoryOpen = true)}
		/>

		{#if $roundPhase !== 'identification' && $roundPhase !== 'finished'}
			<PlayerOrderDisplay
				currentRound={$currentRound}
				actionedPlayers={$actionedPlayers}
				currentActionPlayer={$currentActionPlayer}
			/>
		{/if}

		<div class="game-main">
			<div class="game-content">
				{#if $roundPhase !== 'identification' && $roundPhase !== 'finished'}
					<ArtifactDisplay
						beastHeads={$beastHeads}
						identifiedArtifacts={$identifiedArtifacts}
						failedIdentifications={$failedIdentifications}
						blockedArtifacts={$blockedArtifacts}
						selectedBeastHead={$selectedBeastHead}
						{isMyTurn}
						gamePhase={$gamePhase}
						canIdentify={$remainingSkills ? $remainingSkills.checkArtifact > 0 : false}
						canBlock={$remainingSkills ? $remainingSkills.block > 0 : false}
						showVotingResults={$roundPhase === 'voting' || $roundPhase === 'result'}
						onBeastClick={(beastId) => {
							if (
								$gamePhase === 'identification' &&
								isMyTurn &&
								$remainingSkills &&
								$remainingSkills.checkArtifact > 0
							) {
								identifyBeastHead(beastId);
							} else if (
								$gamePhase === 'skill' &&
								isMyTurn &&
								$remainingSkills &&
								$remainingSkills.block > 0
							) {
								selectedBeastHead.set(beastId);
							}
						}}
					/>
				{/if}

				<PhaseIndicator {isMyTurn} gamePhase={$gamePhase} />

				{#if $roundPhase === 'discussion'}
					<div class="action-area">
						<div class="action-content">
							{#if $isHost}
								<div class="skills-header">
									<h4 class="action-subtitle">討論階段</h4>
									<p class="skills-description">你是房主，可以開始投票階段</p>
								</div>

								<div class="discussion-host-actions">
									<!--                  <p class="action-hint" style="color: #22c55e;">你是房主，可以開始投票階段</p>-->
									<button class="primary-btn" on:click={startVoting}> 開始投票 </button>
								</div>
							{:else}
								<div class="skills-header">
									<h4 class="action-subtitle">討論階段</h4>
									<p class="skills-description">所有玩家已完成行動，現在進入討論時間</p>
								</div>
								<p class="action-hint">等待房主開始投票...</p>
							{/if}
						</div>
					</div>
				{:else if $roundPhase === 'voting'}
					<div class="action-area">
						<div class="action-content">
							<VotingPanel
								{roomName}
								beastHeads={$beastHeads}
								identifiedArtifacts={$identifiedArtifacts}
								isHost={$isHost}
								onVotesSubmitted={fetchArtifacts}
							/>
						</div>
					</div>
				{:else if $roundPhase === 'result'}
					<div class="action-area">
						<div class="action-content">
							<VotingResultPanel
								{roomName}
								beastHeads={$beastHeads}
								isHost={$isHost}
								currentRound={$currentRound}
								onNextRound={async () => {
									await fetchArtifacts();
									await updatePlayersAndRound();
									await fetchRoundStatus();
									gameState.resetSkillsForNewTurn();
								}}
							/>
						</div>
					</div>
				{:else if $roundPhase === 'identification'}
					<div class="action-area">
						<div class="action-content">
							<IdentificationPhasePanel
								{roomName}
								players={$players}
								{currentUser}
								genuineScore={$genuineScore}
							/>
						</div>
					</div>
				{:else if $roundPhase === 'finished'}
					<div class="action-area">
						<div class="action-content">
							{#if $finalResult}
								<FinalResultPanel
									winner={$finalResult.winner}
									xuYuanScore={$finalResult.xuYuanScore}
									allArtifacts={$finalResult.allArtifacts}
									players={$finalResult.players}
									identificationResults={$finalResult.identificationResults}
								/>
							{:else}
								<div class="loading-result">
									<div class="loading-spinner"></div>
									<p>載入最終結果中...</p>
								</div>
							{/if}
						</div>
					</div>
				{:else if isMyTurn}
					<div class="action-area">
						<div class="action-content">
							{#if $gamePhase === 'identification'}
								<IdentificationPhase
									skillActions={$skillActions}
									usedSkills={$usedSkills}
									onIdentify={identifyBeastHead}
									onSkipToSkill={() => gamePhase.set('skill')}
								/>
							{:else if $gamePhase === 'skill'}
								<SkillPhase
									players={$players}
									{currentUser}
									skillActions={$skillActions}
									usedSkills={$usedSkills}
									remainingSkills={$remainingSkills}
									identifiedPlayers={$identifiedPlayers}
									selectedBeastHead={$selectedBeastHead}
									{attackablePlayers}
									onCheckPlayer={checkPlayer}
									onBlockArtifact={(beastId) => {
										blockArtifact(beastId);
										selectedBeastHead.set(null);
									}}
									onAttackPlayer={attackPlayer}
									onSwapArtifact={swapArtifact}
									onFinish={finishSkillPhase}
								/>
							{:else if $gamePhase === 'assign-next'}
								<AssignPhase
									players={$players}
									{assignablePlayers}
									onAssign={assignNextPlayer}
									onEnterDiscussion={enterDiscussion}
								/>
							{/if}
						</div>
					</div>
				{:else}
					<div class="waiting-area">
						<p class="waiting-text">
							{#if $currentActionPlayer}
								等待 {$currentActionPlayer.nickname} 行動中...
							{:else}
								等待其他玩家行動中...
							{/if}
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<NotificationManager />
	<ActionSequence {roomName} bind:isOpen={isActionHistoryOpen} />
{/if}

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		gap: 1rem;
		position: relative;
		z-index: 1;
	}

	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid hsl(var(--muted));
		border-top: 3px solid hsl(var(--primary));
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.game-container {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.game-main {
		display: flex;
		flex-direction: column;
	}

	.game-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.action-area {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		padding: 1.5rem;
		backdrop-filter: blur(10px);
	}

	.action-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.action-hint {
		color: hsl(var(--muted-foreground));
		text-align: center;
		padding: 2rem;
		font-size: 1rem;
	}

	.skills-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
	}

	.action-subtitle {
		color: hsl(var(--foreground));
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		margin: 0;
	}

	.skills-description {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		text-align: center;
	}

	.discussion-host-actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
		padding: 1rem;
	}

	.primary-btn {
		padding: 0.75rem 1.5rem;
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		border: none;
		border-radius: calc(var(--radius));
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
	}

	.primary-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
	}

	.waiting-area {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 3rem 2rem;
	}

	.waiting-text {
		color: hsl(var(--muted-foreground));
		font-size: 1.125rem;
		text-align: center;
		margin: 0;
	}

	.loading-result {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
	}
</style>
