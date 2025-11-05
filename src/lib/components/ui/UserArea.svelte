<script lang="ts">
	export let nickname: string;
	export let email: string = '';
	export let avatar: string | null = null;
	export let onLogout: () => void;
	export let onProfileUpdate:
		| ((updatedUser: { nickname: string; avatar: string | null }) => void)
		| undefined = undefined;

	import EditProfileModal from './EditProfileModal.svelte';

	let isDropdownOpen = false;
	let isEditModalOpen = false;

	// 從 email 或 nickname 生成頭像文字（取第一個字符）
	$: avatarText = (nickname || email || '?').charAt(0).toUpperCase();

	// 根據字串生成顏色
	function stringToColor(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = hash % 360;
		return `hsl(${hue}, 65%, 55%)`;
	}

	$: avatarBgColor = stringToColor(email || nickname);

	function toggleDropdown() {
		isDropdownOpen = !isDropdownOpen;
	}

	function closeDropdown() {
		isDropdownOpen = false;
	}

	function openEditModal() {
		isEditModalOpen = true;
		closeDropdown();
	}

	function handleProfileSave(event: CustomEvent) {
		const updatedUser = event.detail;
		if (onProfileUpdate) {
			onProfileUpdate(updatedUser);
		}
	}

	// 點擊外部關閉下拉選單
	function handleClickOutside(event: MouseEvent) {
		if (isDropdownOpen) {
			const target = event.target as HTMLElement;
			if (!target.closest('.user-area')) {
				closeDropdown();
			}
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="user-area">
	<button class="user-button" on:click|stopPropagation={toggleDropdown}>
		<div class="avatar" style="background-color: {avatar ? 'transparent' : avatarBgColor}">
			{#if avatar}
				<img src={avatar} alt={nickname} class="avatar-img" />
			{:else}
				{avatarText}
			{/if}
		</div>
		<div class="user-info">
			<span class="nickname">{nickname}</span>
			<span class="email">{email}</span>
		</div>
		<svg
			class="dropdown-icon"
			class:open={isDropdownOpen}
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="6 9 12 15 18 9"></polyline>
		</svg>
	</button>

	{#if isDropdownOpen}
		<div class="dropdown-menu">
			<button class="dropdown-item" on:click={openEditModal}>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
					<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
				</svg>
				編輯個人資料
			</button>
			<div class="dropdown-divider"></div>
			<button class="dropdown-item logout" on:click={onLogout}>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
					<polyline points="16 17 21 12 16 7"></polyline>
					<line x1="21" y1="12" x2="9" y2="12"></line>
				</svg>
				登出
			</button>
		</div>
	{/if}
</div>

<EditProfileModal
	bind:isOpen={isEditModalOpen}
	{nickname}
	{email}
	{avatar}
	on:save={handleProfileSave}
	on:close={() => (isEditModalOpen = false)}
/>

<style>
	.user-area {
		position: absolute;
		top: 2rem;
		right: 2rem;
		z-index: 100;
	}

	.user-button {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: hsl(var(--background) / 0.9);
		backdrop-filter: blur(10px);
		border: 1px solid hsl(var(--foreground) / 0.15);
		border-radius: calc(var(--radius) * 2);
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.user-button:hover {
		background: hsl(var(--background));
		border-color: hsl(var(--foreground) / 0.25);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 1.1rem;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
		border: 2px solid hsl(var(--foreground) / 0.1);
		flex-shrink: 0;
		transition: transform 0.2s ease;
	}

	.user-button:hover .avatar {
		transform: scale(1.05);
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.125rem;
		min-width: 0;
	}

	.nickname {
		color: hsl(var(--foreground));
		font-size: 0.95rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px;
	}

	.email {
		color: hsl(var(--foreground) / 0.6);
		font-size: 0.8rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px;
	}

	.dropdown-icon {
		color: hsl(var(--foreground) / 0.5);
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.dropdown-icon.open {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		min-width: 220px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--foreground) / 0.15);
		border-radius: calc(var(--radius) * 1.5);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		padding: 0.5rem;
		animation: slideDown 0.2s ease-out;
		z-index: 101;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		border-radius: var(--radius);
		color: hsl(var(--foreground));
		font-size: 0.95rem;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.dropdown-item:hover {
		background: hsl(var(--foreground) / 0.08);
	}

	.dropdown-item svg {
		color: hsl(var(--foreground) / 0.6);
		flex-shrink: 0;
	}

	.dropdown-item.logout {
		color: #ef4444;
	}

	.dropdown-item.logout svg {
		color: #ef4444;
	}

	.dropdown-item.logout:hover {
		background: #fef2f2;
	}

	.dropdown-divider {
		height: 1px;
		background: hsl(var(--foreground) / 0.1);
		margin: 0.5rem 0;
	}

	@media (max-width: 768px) {
		.user-area {
			top: 1rem;
			right: 1rem;
		}

		.user-button {
			padding: 0.4rem 0.75rem;
			gap: 0.5rem;
		}

		.avatar {
			width: 2rem;
			height: 2rem;
			font-size: 0.95rem;
		}

		.user-info {
			display: none;
		}

		.dropdown-icon {
			width: 16px;
			height: 16px;
		}

		.dropdown-menu {
			min-width: 200px;
		}

		.dropdown-item {
			padding: 0.625rem 0.875rem;
			font-size: 0.9rem;
		}
	}
</style>
