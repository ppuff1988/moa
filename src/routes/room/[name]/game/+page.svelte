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
	import SkillPhase from '$lib/components/game/SkillPhase.svelte';
	import AssignPhase from '$lib/components/game/AssignPhase.svelte';
	import IdentifyPlayerPhase from '$lib/components/game/IdentifyPlayerPhase.svelte';
	import FinalResultPanel from '$lib/components/game/FinalResultPanel.svelte';
	import BlockedActionModal from '$lib/components/game/BlockedActionModal.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

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
		finalResult,
		isGameFinished
	} = gameState;

	let currentUser: User | null = $state(null);
	let isLoading = $state(true);
	let updateInterval: number;
	let isActionHistoryOpen = $state(false);
	let gameService: GameService;
	let socket: Socket | null = null;
	let teammateInfo: { roleName: string; nickname: string; colorCode: string } | null = $state(null);
	let showBlockedModal = $state(false);
	let showIdentifyConfirmModal = $state(false);
	let pendingIdentifyBeastId: number | null = $state(null);
	let isIdentifying = $state(false);
	let actionAreaElement: HTMLDivElement | null = $state(null);

	// roomName 需要立即從 URL 參數初始化
	let roomName = $state($page.params.name || '');

	// 監聽 page 變化並更新 roomName
	$effect(() => {
		const newRoomName = $page.params.name || '';
		if (newRoomName !== roomName) {
			roomName = newRoomName;
		}
	});

	// 使用 $derived 代替 $: 的計算值
	const isMyTurn = $derived(
		$currentActionPlayer?.id === $players.find((p) => p.nickname === currentUser?.nickname)?.id
	);
	const currentUserId = $derived($players.find((p) => p.nickname === currentUser?.nickname)?.id);
	const assignablePlayers = $derived(
		$players.filter((player) => {
			if (player.id === $currentActionPlayer?.id) return false;
			const hasActed = $actionedPlayers.some((ap) => ap.id === player.id);
			return !hasActed;
		})
	);
	const attackablePlayers = $derived($players.filter((player) => player.id !== currentUserId));

	// Update gameStatus based on roundPhase
	let gameStatus = $derived($roundPhase === 'finished' ? 'finished' : 'playing');

	// 同步遊戲狀態到通知系統
	$effect(() => {
		currentGameStatus.set(gameStatus);
	});

	// Initialize game service
	$effect(() => {
		if (roomName) {
			gameService = new GameService(roomName);
		}
	});

	// 當進入技能或指派階段時，自動滾動到行動區域
	$effect(() => {
		if (
			$roundPhase === 'action' &&
			isMyTurn &&
			($gamePhase === 'skill' || $gamePhase === 'assign-next') &&
			actionAreaElement
		) {
			// 延遲一小段時間確保 DOM 已經渲染完成
			setTimeout(() => {
				actionAreaElement?.scrollIntoView({
					behavior: 'smooth',
					block: 'start'
				});
			}, 100);
		}
	});

	// 自動跳過鑑定階段：當玩家沒有鑑定能力時，直接進入技能階段
	$effect(() => {
		if (
			isMyTurn &&
			$gamePhase === 'identification' &&
			$skillActions &&
			$skillActions.checkArtifact === 0 &&
			$roundPhase === 'action'
		) {
			// 檢查是否有其他技能，如果有就進入技能階段，否則進入指派階段
			if ($hasActualSkills) {
				gamePhase.set('skill');
			} else {
				gamePhase.set('assign-next');
				addNotification('請指派下一位玩家', 'info', 3000);
			}
		}
	});

	// 自動完成技能階段：當所有技能都用完時，自動進入指派階段
	$effect(() => {
		if (
			isMyTurn &&
			$gamePhase === 'skill' &&
			$skillActions &&
			$remainingSkills &&
			$roundPhase === 'action'
		) {
			// 檢查是否所有技能都已用完
			const allSkillsUsed =
				$remainingSkills.checkPeople === 0 &&
				$remainingSkills.block === 0 &&
				$remainingSkills.attack === 0 &&
				$remainingSkills.swap === 0;

			if (allSkillsUsed) {
				gamePhase.set('assign-next');
				selectedBeastHead.set(null);
			}
		}
	});

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
			performedActions: actions,
			canAction: playerCanAction
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

		// 檢查 canAction 狀態，如果是我的回合但無法行動，顯示 modal
		// 只在行動階段（action phase）才顯示被攻擊 modal，其他階段不顯示
		if (playerCanAction === false && isMyTurn && $roundPhase === 'action') {
			showBlockedModal = true;
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

		// 恢復封鎖的獸首
		const blockActions = $performedActions.filter((action) => action.type === 'block_artifact');
		if (blockActions.length > 0 && $beastHeads.length > 0) {
			blockActions.forEach((blockAction) => {
				if (blockAction.data && blockAction.data.artifactId) {
					const artifactId = blockAction.data.artifactId as number;
					if (!$blockedArtifacts.includes(artifactId)) {
						blockedArtifacts.update((list) => [...list, artifactId]);
					}
				}
			});
		}

		if (identifyActions.length > 0 && $beastHeads.length > 0) {
			identifyActions.forEach((identifyAction) => {
				if (identifyAction.data) {
					const artifactName = (identifyAction.data.artifactName as string)?.replace('首', '');
					const identifiedBeast = $beastHeads.find((b) => b.animal === artifactName);

					if (identifiedBeast) {
						const isBlocked = identifyAction.data.blocked === true;

						if (isBlocked) {
							if (!$failedIdentifications.includes(identifiedBeast.id)) {
								failedIdentifications.update((list) => [...list, identifiedBeast.id]);
							}
						} else {
							if (!$identifiedArtifacts.includes(identifiedBeast.id)) {
								identifiedArtifacts.update((list) => [...list, identifiedBeast.id]);

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
		}

		// 根據後端的 roundPhase 來判斷，而不是自己推測
		// 如果不是在 action 階段，不需要設置 gamePhase
		if ($roundPhase !== 'action') {
			return;
		}

		// 只有在 action 階段且 skillActions 已加載的情況下才設置遊戲階段
		if (!$skillActions) {
			// skillActions 尚未加載，不設置 gamePhase，等待後續更新
			return;
		}

		// 檢查是否還有剩餘的鑑定次數
		const hasRemainingIdentifications =
			$skillActions.checkArtifact > 0 && $usedSkills.checkArtifact < $skillActions.checkArtifact;

		// 優先判斷鑑定階段：如果還有鑑定次數，保持在 identification 階段
		if (hasRemainingIdentifications) {
			// 保持在 identification 階段，不設置 gamePhase
			return;
		}

		// 只有在是我的回合時才設置階段和顯示通知
		if (!isMyTurn) {
			return;
		}

		// 鑑定次數用完後，根據其他技能使用情況決定階段
		if (hasUsedSkills) {
			gamePhase.set('assign-next');
			addNotification('請指派下一位玩家', 'info', 3000);
		} else if (identifyActions.length > 0) {
			// 已完成鑑定但沒有其他技能使用記錄
			if ($hasActualSkills) {
				gamePhase.set('skill');
			} else {
				gamePhase.set('assign-next');
				addNotification('請指派下一位玩家', 'info', 3000);
			}
		} else if ($skillActions.checkArtifact === 0) {
			// 沒有鑑定能力，直接進入技能階段
			gamePhase.set('skill');
		}
	}

	// ==================== Game Actions ====================

	function openIdentifyConfirm(beastId: number) {
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

		pendingIdentifyBeastId = beastId;
		showIdentifyConfirmModal = true;
	}

	async function confirmIdentifyBeastHead() {
		if (pendingIdentifyBeastId === null) return;

		const beastId = pendingIdentifyBeastId;
		const beast = $beastHeads.find((b) => b.id === beastId);
		if (!beast) return;

		isIdentifying = true;

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

				if ($skillActions && $usedSkills.checkArtifact >= $skillActions.checkArtifact) {
					setTimeout(() => {
						if (!$hasActualSkills) {
							gamePhase.set('assign-next');
							updatePlayersAndRound();
						} else {
							gamePhase.set('skill');
						}
					}, 1500);
				} else if ($skillActions) {
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

				if ($skillActions && $usedSkills.checkArtifact >= $skillActions.checkArtifact) {
					setTimeout(() => {
						if (!$hasActualSkills) {
							gamePhase.set('assign-next');
							updatePlayersAndRound();
						} else {
							gamePhase.set('skill');
						}
					}, 1500);
				} else if ($skillActions) {
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
		} finally {
			showIdentifyConfirmModal = false;
			pendingIdentifyBeastId = null;
			isIdentifying = false;
		}
	}

	function closeIdentifyConfirmModal() {
		showIdentifyConfirmModal = false;
		pendingIdentifyBeastId = null;
		isIdentifying = false;
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
				const currentGameStatus = roomData.game?.status || 'playing';

				// 如果遊戲狀態是 waiting 或 selecting，導向到 lobby 頁面
				if (currentGameStatus === 'waiting' || currentGameStatus === 'selecting') {
					goto(`/room/${encodeURIComponent(roomName)}/lobby`, { replaceState: true });
					return;
				}

				// 如果遊戲已結束，獲取最終結果並顯示
				if (currentGameStatus === 'finished') {
					const finalResultData = await gameService.fetchFinalResult();
					if (finalResultData && finalResultData.success) {
						finalResult.set(finalResultData);
						roundPhase.set('finished');
						isGameFinished.set(true);
						addNotification(`遊戲已結束！${finalResultData.winner}獲勝！`, 'info', 5000);
					}
				} else {
					// 遊戲進行中，正常載入遊戲資料
					// 首先獲取回合狀態，確保 roundPhase 被正確設置
					await fetchRoundStatus();
					// 然後更新玩家和回合資料（可能會觸發 fetchMyRole）
					await updatePlayersAndRound();
					await fetchArtifacts();
					await fetchTeammateInfo();

					// 確保在恢復狀態之前先獲取角色信息（即使不是玩家回合也要獲取）
					if (!$hasLoadedSkills) {
						await fetchMyRole();
					}

					restoreUsedSkills();
					restoreIdentifiedState();
				}

				// Initialize socket connection
				try {
					console.log('[socket] 初始化 socket 連接...');
					socket = initSocket();

					// Join the game room
					console.log(`[socket] 加入房間: ${roomName}`);
					socket.emit('join-room', roomName);

					// 監聽房間加入成功事件
					socket.on('room-update', () => {
						console.log('[socket] 收到 room-update 事件，確認已成功加入房間');
					});

					socket.on('error', (error) => {
						console.error('[socket] Socket 錯誤:', error);
					});

					// Listen for voting-completed event
					socket.on('voting-completed', async (data) => {
						console.log('[voting-completed] 收到投票完成事件:', data);
						addNotification('投票結果已公布', 'info', 3000);

						// Update phase to result
						if (data.phase) {
							console.log('[voting-completed] 更新階段為:', data.phase);
							roundPhase.set(data.phase);
						}

						// Refresh artifacts to get voting results
						console.log('[voting-completed] 刷新獸首資料...');
						await fetchArtifacts();
						await fetchRoundStatus();
						console.log('[voting-completed] 數據刷新完成');
					});

					// Listen for round-started event
					socket.on('round-started', async (data) => {
						addNotification(`第 ${data.round} 回合已開始`, 'success', 3000);

						// Update current round
						if (data.round) {
							currentRound.set(data.round);
						}

						// Reset game state for new round
						gameState.resetSkillsForNewTurn();

						// Refresh all game data
						await fetchArtifacts();
						await updatePlayersAndRound();
						await fetchRoundStatus();
						await fetchMyRole();
					});

					// Listen for player-assigned event (when a new player is assigned to act)
					socket.on('player-assigned', async () => {
						// Refresh player data to check if it's my turn
						await updatePlayersAndRound();

						// Check if it's my turn now
						const myPlayer = $players.find((p) => p.nickname === currentUser?.nickname);
						const isNowMyTurn = $currentActionPlayer?.id === myPlayer?.id;

						if (isNowMyTurn) {
							// Fetch role info to check canAction status
							const roleData = await gameService.fetchMyRole();

							// If canAction is false, show blocked modal
							// 只在行動階段（action phase）才顯示被攻擊 modal
							if (roleData.canAction === false && $roundPhase === 'action') {
								showBlockedModal = true;
							}

							// Update skill actions if available
							if (roleData.skillActions) {
								skillActions.set(roleData.skillActions);
								hasLoadedSkills.set(true);
							}

							if (roleData.performedActions && roleData.performedActions.length > 0) {
								performedActions.set(roleData.performedActions);
							}
						}
					});

					// Listen for enter-identification-phase event
					socket.on('enter-identification-phase', async (data) => {
						addNotification(data.message || '進入鑑人階段', 'info', 4000);

						// Update phase
						roundPhase.set('identification');

						// Refresh data
						await fetchRoundStatus();
					});

					// Listen for identification-completed event
					socket.on('identification-completed', async (data) => {
						addNotification(`遊戲結束！${data.winner}獲勝！`, 'success', 5000);

						// Update final result
						finalResult.set(data);
						roundPhase.set('finished');
						isGameFinished.set(true);

						// Refresh data
						await fetchRoundStatus();
					});

					// Listen for game-finished event
					socket.on('game-finished', async (data) => {
						addNotification(`遊戲結束！${data.winner}獲勝！`, 'success', 5000);

						// Update final result
						finalResult.set(data);
						roundPhase.set('finished');
						isGameFinished.set(true);

						// Refresh data
						await fetchRoundStatus();
					});
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

		{#if !['identification', 'finished', 'discussion', 'voting', 'result'].includes($roundPhase)}
			<PlayerOrderDisplay
				currentActionPlayer={$currentActionPlayer}
				actionedPlayers={$actionedPlayers}
			/>
		{/if}

		<!-- 等待提示區域 - 放在行動順序和獸首之間 -->
		{#if $roundPhase === 'action' && !isMyTurn}
			<div class="waiting-area">
				<div class="waiting-card">
					<div class="waiting-icon">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="32"
							height="32"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="waiting-spinner"
						>
							<path d="M21 12a9 9 0 1 1-6.219-8.56" />
						</svg>
					</div>
					<p class="waiting-text">
						{#if $currentActionPlayer}
							等待 <span class="highlight-player">{$currentActionPlayer.nickname}</span> 行動中...
						{:else}
							等待其他玩家行動中...
						{/if}
					</p>
				</div>
			</div>
		{/if}

		<div class="game-main">
			<div class="game-content">
				{#if $roundPhase === 'action'}
					<PhaseIndicator {isMyTurn} gamePhase={$gamePhase} />
				{/if}

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
						currentRound={$currentRound}
						autoCollapse={$roundPhase === 'discussion' ||
							$roundPhase === 'voting' ||
							($roundPhase === 'action' &&
								isMyTurn &&
								($gamePhase === 'skill' || $gamePhase === 'assign-next') &&
								$currentPlayerRole !== '鄭國渠')}
						showIdentifyHint={$roundPhase === 'action' &&
							isMyTurn &&
							$gamePhase === 'identification'}
						remainingIdentifyCount={$skillActions && $usedSkills
							? $skillActions.checkArtifact - $usedSkills.checkArtifact
							: 0}
						hasIdentifySkill={$skillActions ? $skillActions.checkArtifact > 0 : false}
						onBeastClick={(beastId) => {
							if (
								$gamePhase === 'identification' &&
								isMyTurn &&
								$remainingSkills &&
								$remainingSkills.checkArtifact > 0
							) {
								openIdentifyConfirm(beastId);
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

				{#if $roundPhase === 'discussion'}
					<div class="action-area">
						<div class="action-content discussion-phase">
							<div class="phase-card">
								<div class="phase-icon">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="48"
										height="48"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
										<line x1="9" y1="10" x2="15" y2="10"></line>
										<line x1="12" y1="7" x2="12" y2="13"></line>
									</svg>
								</div>
								<div class="skills-header">
									<h4 class="action-subtitle">討論階段</h4>
									{#if $isHost}
										<p class="skills-description">你是房主，可以開始投票階段</p>
									{:else}
										<p class="skills-description">所有玩家已完成行動，現在進入討論時間</p>
									{/if}
								</div>

								{#if $isHost}
									<div class="discussion-host-actions">
										<button class="start-voting-btn" onclick={startVoting}>
											<span>開始投票</span>
											<span class="voting-arrow">→</span>
										</button>
									</div>
								{/if}
							</div>
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
				{:else if $roundPhase === 'identification'}
					<div class="action-area">
						<div class="action-content">
							<IdentifyPlayerPhase {roomName} players={$players} {currentUser} />
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
				{:else if isMyTurn && $gamePhase !== 'identification'}
					<div class="action-area" bind:this={actionAreaElement}>
						<div class="action-content">
							{#if $gamePhase === 'skill'}
								<SkillPhase
									players={$players}
									{currentUser}
									skillActions={$skillActions}
									usedSkills={$usedSkills}
									remainingSkills={$remainingSkills}
									identifiedPlayers={$identifiedPlayers}
									selectedBeastHead={$selectedBeastHead}
									beastHeads={$beastHeads}
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
				{/if}
			</div>
		</div>
	</div>

	<NotificationManager />
	<ActionSequence {roomName} bind:isOpen={isActionHistoryOpen} />
	<BlockedActionModal
		bind:isOpen={showBlockedModal}
		onConfirm={() => {
			showBlockedModal = false;
		}}
	/>
	<ConfirmModal
		isOpen={showIdentifyConfirmModal}
		title="確認鑑定"
		message={pendingIdentifyBeastId !== null
			? `確定要鑑定 ${$beastHeads.find((b) => b.id === pendingIdentifyBeastId)?.animal}首 嗎？`
			: '確定要鑑定此獸首嗎？'}
		confirmText="確認"
		cancelText="取消"
		isProcessing={isIdentifying}
		onConfirm={confirmIdentifyBeastHead}
		onCancel={closeIdentifyConfirmModal}
	/>
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

	.loading-container p {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid rgba(212, 175, 55, 0.3);
		border-top: 3px solid #d4af37;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
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
		padding: 1rem;
		backdrop-filter: blur(10px);
	}

	.action-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skills-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		margin-bottom: 1rem;
	}

	.action-subtitle {
		color: hsl(var(--foreground));
		font-size: 1.25rem;
		font-weight: 600;
		text-align: center;
		margin: 0;
	}

	.skills-description {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		text-align: center;
		margin: 0;
	}

	.discussion-host-actions {
		display: flex;
		justify-content: center;
		padding: 1rem;
		width: 100%;
	}

	.start-voting-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.875rem;
		padding: 1rem 2.5rem;
		background: linear-gradient(135deg, #d4af37 0%, #f4e5b1 50%, #d4af37 100%);
		color: #1a1a1a;
		border: none;
		border-radius: 0.875rem;
		font-size: 1.0625rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 16px rgba(212, 175, 55, 0.3);
		position: relative;
		overflow: hidden;
	}

	.start-voting-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}

	.start-voting-btn:hover::before {
		transform: translateX(100%);
	}

	.start-voting-btn:hover {
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(212, 175, 55, 0.5);
	}

	.start-voting-btn:active {
		transform: translateY(-1px);
	}

	.start-voting-btn:hover {
		transform: translateX(6px);
	}

	.discussion-phase {
		width: 100%;
	}

	.phase-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius) * 1.5);
		backdrop-filter: blur(15px);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.phase-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1));
		border: 2px solid rgba(212, 175, 55, 0.4);
		border-radius: 50%;
		color: #d4af37;
		box-shadow:
			0 4px 12px rgba(212, 175, 55, 0.2),
			inset 0 2px 0 rgba(255, 255, 255, 0.1);
		animation: pulse-glow 2s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%,
		100% {
			box-shadow:
				0 4px 12px rgba(212, 175, 55, 0.2),
				inset 0 2px 0 rgba(255, 255, 255, 0.1);
			transform: scale(1);
		}
		50% {
			box-shadow:
				0 4px 20px rgba(212, 175, 55, 0.4),
				inset 0 2px 0 rgba(255, 255, 255, 0.15),
				0 0 30px rgba(212, 175, 55, 0.2);
			transform: scale(1.05);
		}
	}

	@keyframes hourglass-rotate {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(180deg);
		}
	}

	.waiting-text {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		text-align: center;
		margin: 0;
		letter-spacing: 0.02em;
		opacity: 0.9;
	}

	@keyframes dot-bounce {
		0%,
		80%,
		100% {
			transform: scale(1);
			opacity: 0.6;
		}
		40% {
			transform: scale(1.3);
			opacity: 1;
		}
	}

	.waiting-area {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0;
		margin: 1.5rem 0;
		width: 100%;
	}

	.waiting-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 1.5rem 2rem;
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.15));
		border: 2px solid rgba(255, 215, 0, 0.4);
		border-radius: calc(var(--radius));
		backdrop-filter: blur(20px);
		box-shadow: 0 8px 32px rgba(255, 215, 0, 0.2);
		animation: pulse-border 2s ease-in-out infinite;
		width: 100%;
	}

	@keyframes pulse-border {
		0%,
		100% {
			border-color: rgba(255, 215, 0, 0.4);
			box-shadow: 0 8px 32px rgba(255, 215, 0, 0.2);
		}
		50% {
			border-color: rgba(255, 215, 0, 0.6);
			box-shadow:
				0 8px 32px rgba(255, 215, 0, 0.3),
				0 0 30px rgba(255, 215, 0, 0.2);
		}
	}

	.waiting-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffd700;
		flex-shrink: 0;
	}

	.waiting-spinner {
		animation: rotate 2s linear infinite;
		fill: none;
	}

	@keyframes rotate {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.waiting-text {
		color: hsl(var(--foreground));
		font-size: 1.25rem;
		font-weight: 600;
		text-align: center;
		margin: 0;
		letter-spacing: 0.02em;
	}

	.highlight-player {
		color: #ffd700;
		font-weight: 700;
		text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
	}

	@media (max-width: 768px) {
		.game-container {
			padding: 0.5rem 0.5rem;
		}

		.waiting-area {
			margin: 1rem 0;
		}

		.waiting-card {
			padding: 1rem 1.5rem;
			gap: 0.75rem;
		}

		.waiting-icon svg {
			width: 20px;
			height: 20px;
		}

		.waiting-text {
			font-size: 1rem;
		}
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

	.loading-result p {
		color: hsl(var(--foreground));
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}
</style>
