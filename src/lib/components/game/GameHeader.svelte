<script lang="ts">
	import { leaveRoom } from '$lib/utils/room';
	import ActionButton from '$lib/components/ui/ActionButton.svelte';

	export let roomName: string;
	export let currentUserNickname: string | undefined;
	export let currentPlayerRole: string | null;
	export let onOpenHistory: () => void;
	export let teammateInfo: { roleName: string; nickname: string; colorCode: string } | null = null;
	export let gameStatus: string = 'playing';

	async function handleLeaveRoom() {
		await leaveRoom(roomName);
	}
</script>

<div class="room-header">
	<div class="room-info">
		<h1 class="room-title">房間：{roomName}</h1>
		<div class="room-meta">
			{#if currentUserNickname}
				<span class="meta-item">玩家：{currentUserNickname}</span>
			{/if}
			{#if currentPlayerRole}
				{#if currentUserNickname}
					<span class="meta-divider">·</span>
				{/if}
				<span class="meta-item role-highlight">角色：{currentPlayerRole}</span>
			{/if}
			{#if teammateInfo}
				{#if currentUserNickname || currentPlayerRole}
					<span class="meta-divider">·</span>
				{/if}
				<span class="meta-item teammate-info">
					<span class="teammate-role">{teammateInfo.roleName}:</span>
					<span class="teammate-name" style="color: {teammateInfo.colorCode}"
						>{teammateInfo.nickname}</span
					>
				</span>
			{/if}
		</div>
	</div>

	<div class="header-actions">
		<button class="history-btn" on:click={onOpenHistory}> 📜 查看行動歷史 </button>
		{#if gameStatus === 'finished'}
			<ActionButton variant="destructive" title="離開房間" subtitle="" onClick={handleLeaveRoom} />
		{/if}
	</div>
</div>

<style>
	.room-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: calc(var(--radius));
		padding: 1.5rem;
		backdrop-filter: blur(10px);
	}

	.room-title {
		color: hsl(var(--foreground));
		font-size: 2rem;
		font-weight: 600;
		margin: 0;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.room-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		margin-top: 0.75rem;
	}

	.meta-item {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 500;
	}

	.meta-divider {
		color: rgba(255, 255, 255, 0.5);
		font-weight: 300;
		user-select: none;
	}

	.role-highlight {
		color: #fbbf24;
		font-weight: 700;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}

	.teammate-info {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.teammate-role {
		color: #ef4444;
		font-weight: 700;
	}

	.teammate-name {
		font-weight: 700;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}

	.header-actions {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.header-actions :global(.action-btn) {
		padding: 0.625rem 1.25rem;
		min-width: 120px;
		font-size: 0.875rem;
	}

	.header-actions :global(.action-title) {
		font-size: 1rem;
	}

	.header-actions :global(.action-subtitle) {
		font-size: 0.7rem;
	}

	.history-btn {
		padding: 0.625rem 1.25rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: calc(var(--radius));
		color: hsl(var(--foreground));
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: var(--transition-elegant);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.history-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(212, 175, 55, 0.5);
		transform: translateY(-2px);
	}

	@media (max-width: 768px) {
		.room-header {
			flex-direction: column;
			gap: 1rem;
		}

		.room-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.meta-divider {
			display: none;
		}
	}
</style>
