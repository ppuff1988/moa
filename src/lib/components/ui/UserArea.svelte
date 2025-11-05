<script lang="ts">
	export let nickname: string;
	export let email: string = '';
	export let avatar: string | null = null;
	export let onLogout: () => void;

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
</script>

<div class="user-area">
	<div class="avatar" style="background-color: {avatar ? 'transparent' : avatarBgColor}">
		{#if avatar}
			<img src={avatar} alt={nickname} class="avatar-img" />
		{:else}
			{avatarText}
		{/if}
	</div>
	<span class="welcome-text">歡迎，{nickname}</span>
	<button on:click={onLogout} class="logout-btn">登出</button>
</div>

<style>
	.user-area {
		position: absolute;
		top: 2rem;
		right: 2rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		z-index: 10;
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
		font-size: 1.2rem;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
		border: 2px solid hsl(var(--background) / 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		transition: var(--transition-elegant);
	}

	.avatar:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}

	.welcome-text {
		color: hsl(var(--foreground));
		font-size: 1rem;
		font-weight: 500;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.logout-btn {
		background: transparent;
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--foreground) / 0.3);
		border-radius: calc(var(--radius));
		padding: 0.5rem 1rem;
		font-weight: 500;
		font-size: 0.9rem;
		cursor: pointer;
		transition: var(--transition-elegant);
		backdrop-filter: blur(10px);
		text-shadow: 0 2px 4px hsl(var(--background) / 0.8);
	}

	.logout-btn:hover {
		background: hsl(var(--foreground) / 0.1);
		border-color: hsl(var(--foreground) / 0.5);
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.user-area {
			top: 1rem;
			right: 1rem;
			gap: 0.5rem;
		}

		.avatar {
			width: 2rem;
			height: 2rem;
			font-size: 1rem;
		}

		.welcome-text {
			font-size: 0.9rem;
		}

		.logout-btn {
			padding: 0.4rem 0.8rem;
			font-size: 0.8rem;
		}
	}
</style>
