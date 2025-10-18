<script lang="ts">
	import { onMount } from 'svelte';
	import { getJWTToken } from '$lib/utils/jwt';
	import type { Player } from '$lib/types/game';

	export let player: Player;
	export let isCurrentUser: boolean = false;
	export let onKick: (() => void) | undefined = undefined;
	export let gameStatus: string = 'waiting';
	export let roomName: string = '';
	export let playerCount: number = 0;

	// 可選的角色列表（從 API 獲取）
	let availableRoles: Array<{ id: number; name: string; camp: string }> = [];
	let availableColors = ['紅', '橙', '黃', '綠', '藍', '紫', '黑', '白'];

	// 顏色對應的 hex 值
	const colorMap: Record<string, string> = {
		紅: '#EF4444',
		橙: '#F97316',
		黃: '#EAB308',
		綠: '#22C55E',
		藍: '#3B82F6',
		紫: '#A855F7',
		黑: '#1F2937',
		白: '#F3F4F6'
	};

	let selectedRoleId = player.roleId || null;
	let selectedColor = player.color || '未選顏色';
	let isLocked = player.isReady || false;
	let errorMessage = '';
	let isLoadingRoles = false;
	let previousIsReady = player.isReady || false;
	let hasLoadedRoles = false;

	// 同步 player 的 isReady 狀態
	$: isLocked = player.isReady || false;

	// 當遊戲狀態變為 selecting 時，立即獲取角色列表（無論是否為當前玩家）
	$: if (gameStatus === 'selecting' && !hasLoadedRoles && !isLoadingRoles) {
		fetchRoles();
		hasLoadedRoles = true;
	}

	// 只在鎖定狀態改變時才同步數據
	$: {
		const currentIsReady = player.isReady || false;

		if (previousIsReady && !currentIsReady) {
			selectedRoleId = player.roleId || null;
			selectedColor = player.color || '未選顏色';
		} else if (!previousIsReady && currentIsReady) {
			if (player.roleId) selectedRoleId = player.roleId;
			if (player.color) selectedColor = player.color;
		} else if (currentIsReady) {
			if (player.roleId) selectedRoleId = player.roleId;
			if (player.color) selectedColor = player.color;
		}

		previousIsReady = currentIsReady;
	}

	// 決定指示燈顏色：顯示玩家選擇的顏色
	$: indicatorColor = player.color && colorMap[player.color] ? colorMap[player.color] : '';

	// 決定是否顯示指示燈：只有選擇了顏色才顯示
	$: showIndicator = player.color && colorMap[player.color];

	// 組件掛載時獲取角色列表
	onMount(async () => {
		await fetchRoles();
	});

	async function fetchRoles() {
		isLoadingRoles = true;
		try {
			const url = playerCount > 0 ? `/api/roles?playerCount=${playerCount}` : '/api/roles';
			const response = await fetch(url);
			const data = await response.json();

			if (response.ok) {
				availableRoles = data.roles;
			} else {
				errorMessage = '獲取角色列表失敗';
				setTimeout(() => (errorMessage = ''), 3000);
			}
		} catch {
			errorMessage = '獲取角色列表失敗';
			setTimeout(() => (errorMessage = ''), 3000);
		} finally {
			isLoadingRoles = false;
		}
	}

	async function handleRoleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const roleId = parseInt(target.value);

		selectedRoleId = roleId;
	}

	async function handleColorChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const color = target.value;

		selectedColor = color;
	}

	async function handleConfirmSelection() {
		const token = getJWTToken();
		if (!token) {
			errorMessage = '請先登入';
			setTimeout(() => (errorMessage = ''), 3000);
			return;
		}

		if (isLocked) {
			// 解鎖角色和顏色
			try {
				const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/unlock-role`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					}
				});

				const data = await response.json();

				if (!response.ok) {
					errorMessage = data.message || '取消鎖定失敗';
					setTimeout(() => (errorMessage = ''), 3000);
					return;
				}

				// 立即更新本地狀態
				player.isReady = false;
				player.roleId = null;
				player.color = null;
				player.colorCode = undefined;

				selectedRoleId = null;
				selectedColor = '未選顏色';

				errorMessage = '';
			} catch {
				errorMessage = '取消鎖定失敗';
				setTimeout(() => (errorMessage = ''), 3000);
			}
		} else {
			// 鎖定角色和顏色
			if (!selectedRoleId || selectedColor === '未選顏色') {
				errorMessage = '請先選擇角色和顏色';
				setTimeout(() => (errorMessage = ''), 3000);
				return;
			}

			try {
				const response = await fetch(`/api/room/${encodeURIComponent(roomName)}/lock-role`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						roleId: selectedRoleId,
						color: selectedColor
					})
				});

				const data = await response.json();

				if (!response.ok) {
					errorMessage = data.message || '鎖定失敗';
					setTimeout(() => (errorMessage = ''), 3000);
					return;
				}

				// 立即更新本地狀態
				player.isReady = true;
				player.roleId = selectedRoleId;
				player.color = data.color || selectedColor;
				player.colorCode = data.colorCode;

				errorMessage = '';
			} catch {
				errorMessage = '鎖定失敗';
				setTimeout(() => (errorMessage = ''), 3000);
			}
		}
	}
</script>

<div class="player-card" class:is-current-user={isCurrentUser} data-testid="player-item">
	<!-- 狀態指示燈：只有選擇了顏色才顯示 -->
	{#if showIndicator}
		<div class="status-indicator" style="background-color: {indicatorColor}"></div>
	{/if}

	<!-- 右上角操作按鈕 -->
	<div class="top-actions">
		<!-- 選角階段顯示鎖定狀態圖示 -->
		{#if gameStatus === 'selecting'}
			<div
				class="icon-btn lock-status"
				class:locked={player.isReady}
				title={player.isReady ? '已鎖定' : '未鎖定'}
			>
				{#if player.isReady}
					<!-- 已鎖定：顯示閉鎖圖示 -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
					</svg>
				{:else}
					<!-- 未鎖定：顯示開鎖圖示 -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
						<path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
					</svg>
				{/if}
			</div>
		{/if}

		<!-- 踢出按鈕（房主功能）- 只在 waiting 階段顯示 -->
		{#if onKick && !isCurrentUser && gameStatus === 'waiting'}
			<button class="icon-btn kick-btn" on:click={onKick} aria-label="踢出玩家" title="踢出玩家">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
					<circle cx="9" cy="7" r="4"></circle>
					<line x1="17" y1="8" x2="22" y2="13"></line>
					<line x1="22" y1="8" x2="17" y2="13"></line>
				</svg>
			</button>
		{/if}
	</div>

	<!-- 玩家資訊 -->
	<div class="player-info">
		<div class="name-row">
			<div class="player-name">{player.nickname}</div>
			{#if player.isHost}
				<div class="host-badge">房主</div>
			{/if}
		</div>

		{#if gameStatus === 'waiting'}
			<!-- 等待階段：顯示未選角色 -->
			<div class="player-role">
				角色: <span class="role-color">未選角色</span>
			</div>
		{:else if gameStatus === 'selecting'}
			<!-- 選角階段：顯示下拉選單 -->
			{#if isCurrentUser}
				{#if errorMessage}
					<div class="error-message">{errorMessage}</div>
				{/if}
				<div class="selection-group">
					<label class="selection-label">
						<span class="label-text">角色選擇</span>
						<select
							class="selection-dropdown"
							value={selectedRoleId ?? ''}
							on:change={handleRoleChange}
							disabled={isLocked || isLoadingRoles}
						>
							<option value="" disabled selected={!selectedRoleId}
								>{isLoadingRoles ? '載入中...' : '請選擇角色'}</option
							>
							{#each availableRoles as role (role.id)}
								<option value={role.id}>{role.name}</option>
							{/each}
						</select>
					</label>
				</div>
				<div class="selection-group">
					<label class="selection-label">
						<span class="label-text">顏色選擇</span>
						<div class="color-select-wrapper">
							<select
								class="selection-dropdown color-dropdown"
								bind:value={selectedColor}
								on:change={handleColorChange}
								disabled={isLocked}
							>
								<option value="未選顏色" disabled>請選擇顏色</option>
								{#each availableColors as color (color)}
									<option value={color}>{color}</option>
								{/each}
							</select>
							{#if selectedColor !== '未選顏色'}
								<span class="color-indicator" style="background-color: {colorMap[selectedColor]};"
								></span>
							{/if}
						</div>
					</label>
				</div>
			{:else}
				<!-- 其他玩家：顯示其選擇狀態 -->
				<div class="player-role">
					角色: <span class="role-color" style="color: {player.isReady ? '#22C55E' : '#888'}">
						{player.isReady ? '已選擇' : '未選角色'}
					</span>
				</div>
				<div class="player-status">
					顏色:
					{#if player.color && colorMap[player.color]}
						<span class="color-display">
							<span class="color-dot" style="background-color: {colorMap[player.color]};"></span>
							<span style="color: {colorMap[player.color]}">{player.color}</span>
						</span>
					{:else}
						<span style="color: #888">未選顏色</span>
					{/if}
				</div>
			{/if}
		{:else}
			<!-- 遊戲中或已結束：顯示角色和顏色 -->
			{#if player.role}
				<div class="player-role">
					角色: <span class="role-color" style="color: {player.color || '#888'}">{player.role}</span
					>
				</div>
			{/if}
		{/if}
	</div>

	<!-- 操作按鈕區域 -->
	<div class="player-actions">
		{#if gameStatus === 'selecting' && isCurrentUser}
			<button
				class="confirm-btn"
				class:locked={isLocked}
				on:click={handleConfirmSelection}
				disabled={!isLocked && (!selectedRoleId || selectedColor === '未選顏色')}
			>
				{#if isLocked}
					<!-- 已鎖定：顯示閉鎖圖示 -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						style="margin-right: 0.25rem;"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
					</svg>
					取消鎖定
				{:else}
					<!-- 未鎖定：顯示開鎖圖示 -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						style="margin-right: 0.25rem;"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
						<path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
					</svg>
					鎖定
				{/if}
			</button>
		{/if}
	</div>
</div>

<style>
	.player-card {
		position: relative;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		padding: 1rem;
		backdrop-filter: blur(10px);
		transition: var(--transition-elegant);
		min-height: 120px;
	}

	.player-card:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
		transform: translateY(-2px);
	}

	.player-card.is-current-user {
		border-color: hsl(var(--secondary));
		background: rgba(255, 255, 255, 0.15);
	}

	.status-indicator {
		position: absolute;
		top: 0.75rem;
		left: 0.75rem;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		box-shadow: 0 0 8px currentColor;
	}

	.top-actions {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		gap: 0.25rem;
	}

	.icon-btn {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		border-radius: calc(var(--radius) * 0.5);
		background: transparent;
		color: white;
		cursor: pointer;
		transition: var(--transition-elegant);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lock-status {
		cursor: default;
		pointer-events: none;
		color: #f59e0b; /* 未鎖定時的橙色 */
	}

	.lock-status.locked {
		color: #ef4444; /* 已鎖定時改為紅色 */
	}

	.kick-btn {
		color: #ef4444;
	}

	.kick-btn:hover {
		background: rgba(78, 106, 92, 0.5);
		transform: scale(1.1);
	}

	.player-info {
		margin-top: 1.5rem;
		color: hsl(var(--foreground));
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.player-name {
		font-size: 1.1rem;
		font-weight: 600;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.host-badge {
		background: var(--gradient-gold);
		color: hsl(var(--secondary-foreground));
		padding: 0.15rem 0.4rem;
		border-radius: calc(var(--radius) * 0.5);
		font-size: 0.7rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.player-role,
	.player-status {
		font-size: 0.9rem;
		margin-bottom: 0.25rem;
		color: hsl(var(--muted-foreground));
	}

	.role-color {
		font-weight: 600;
	}

	.color-display {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-weight: 600;
	}

	.color-dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.3);
		box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
	}

	.player-actions {
		margin-top: 1rem;
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.selection-group {
		margin-bottom: 0.75rem;
	}

	.selection-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
		color: hsl(var(--muted-foreground));
	}

	.label-text {
		min-width: 80px;
		font-weight: 500;
	}

	.selection-dropdown {
		width: 100%;
		padding: 0.6rem 0.8rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius) * 0.75);
		background: rgba(0, 0, 0, 0.3);
		color: hsl(var(--foreground));
		font-size: 0.9rem;
		cursor: pointer;
		transition: var(--transition-elegant);
		backdrop-filter: blur(5px);
	}

	.selection-dropdown:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.3);
		background: rgba(0, 0, 0, 0.4);
	}

	.selection-dropdown:focus {
		outline: none;
		border-color: hsl(var(--secondary));
		box-shadow: 0 0 0 2px hsl(var(--secondary) / 0.2);
	}

	.selection-dropdown option {
		background: rgba(20, 20, 20, 0.95);
		color: white;
		padding: 0.5rem;
	}

	.selection-dropdown:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.color-dropdown {
		margin-top: 0.25rem;
	}

	.color-select-wrapper {
		position: relative;
		width: 100%;
	}

	.color-indicator {
		position: absolute;
		right: 2.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.3);
		pointer-events: none;
		box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
	}

	.confirm-btn {
		width: 100%;
		padding: 0.6rem 1rem;
		border: none;
		border-radius: calc(var(--radius) * 0.75);
		background: var(--gradient-gold);
		color: rgba(0, 0, 0, 0.85);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-elegant);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.confirm-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: rgba(100, 100, 100, 0.5);
	}

	.confirm-btn.locked {
		background: linear-gradient(
			135deg,
			hsl(var(--destructive)) 0%,
			hsl(var(--destructive) / 0.85) 100%
		);
		color: hsl(var(--destructive-foreground));
	}

	.confirm-btn.locked:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
	}

	.error-message {
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.4);
		color: #fca5a5;
		padding: 0.5rem;
		border-radius: calc(var(--radius) * 0.5);
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
		text-align: center;
	}
</style>
