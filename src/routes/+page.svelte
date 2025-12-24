<script lang="ts">
	import { onMount } from 'svelte';
	import { useLeaveRoom } from '$lib/composables/useLeaveRoom';
	import RoomForm from '$lib/components/room/RoomForm.svelte';
	import UserArea from '$lib/components/ui/UserArea.svelte';
	import MainTitle from '$lib/components/ui/MainTitle.svelte';
	import ActionButton from '$lib/components/ui/ActionButton.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

	interface User {
		id: number;
		nickname: string;
		email: string;
		avatar?: string | null;
	}

	interface CurrentGame {
		id: string;
		roomName: string;
		status: string;
		playerCount: number;
	}

	interface PageData {
		user: User | null;
		currentGame: CurrentGame | null;
	}

	export let data: PageData;

	// 使用服務端載入的數據
	let user: User | null = data.user;
	let currentGame: CurrentGame | null = data.currentGame;
	let showRoomForm = false;
	let roomFormMode: 'create' | 'join' = 'create';

	// FAQ 展開狀態
	let expandedFaq: number | null = null;

	// 手機版選單狀態
	let mobileMenuOpen = false;

	const faqItems = [
		{
			question: '古董局中局是什麼遊戲？',
			answer:
				'古董局中局是一款多人策略推理桌遊，玩家扮演古董鑑定專家，在充滿謎團的古董世界中辨別真偽、推理線索、與其他玩家鬥智鬥勇。遊戲結合了角色扮演、邏輯推理和策略博弈等元素。'
		},
		{
			question: '遊戲需要幾個人才能開始？',
			answer: '遊戲支援 6-8 位玩家進行，人數越多，遊戲的策略性和趣味性越高。'
		},
		{
			question: '一場遊戲大概需要多長時間？',
			answer: '根據玩家人數和遊戲進程，一場遊戲通常需要 30-60 分鐘。新手可能需要更長時間熟悉規則。'
		},
		{
			question: '需要下載 App 嗎？',
			answer:
				'不需要！MOA 是純網頁版輔助程式，打開瀏覽器即可遊玩，支援電腦、平板和手機等各種裝置，無需安裝任何應用程式。'
		},
		{
			question: '如何邀請朋友一起玩？',
			answer:
				'註冊登入後，創建一個遊戲房間，然後將房間名稱與密碼分享給朋友，輸入後即可加入您的遊戲。'
		},
		{
			question: '遊戲是免費的嗎？',
			answer:
				'是的，MOA 目前完全免費！您只需要註冊帳號即可享受完整的遊戲體驗，但仍然需要結合實體桌遊才能有最佳體驗。'
		},
		{
			question: '如果遇到 Bug 該怎麼辦？',
			answer:
				'如果您在使用過程中遇到任何問題或 Bug，歡迎到我們的 GitHub 頁面提交 Issue，我們會盡快處理。<a href="https://github.com/ppuff1988/moa/issues" target="_blank" rel="noopener noreferrer" style="color: hsl(var(--primary)); text-decoration: underline;">立即回報</a>'
		}
	];

	const {
		showLeaveConfirmModal,
		isLeavingRoom,
		handleLeaveRoom,
		closeLeaveConfirmModal,
		handleConfirmLeave
	} = useLeaveRoom();

	function createRoom() {
		roomFormMode = 'create';
		showRoomForm = true;
	}

	function joinRoom() {
		roomFormMode = 'join';
		showRoomForm = true;
	}

	function closeRoomForm() {
		showRoomForm = false;
	}

	async function logout() {
		const { logout } = await import('$lib/utils/jwt');
		await logout();
	}

	function handleProfileUpdate(updatedUser: { nickname: string; avatar: string | null }) {
		if (user) {
			user = {
				...user,
				nickname: updatedUser.nickname,
				avatar: updatedUser.avatar
			};
		}
	}

	function backToRoom() {
		if (!currentGame) return;

		const { roomName, status } = currentGame;
		const basePath = `/room/${encodeURIComponent(roomName)}`;
		window.location.href = ['waiting', 'selection'].includes(status)
			? `${basePath}/lobby`
			: `${basePath}/game`;
	}

	function toggleFaq(index: number) {
		expandedFaq = expandedFaq === index ? null : index;
	}

	function scrollToSection(sectionId: string) {
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
		mobileMenuOpen = false;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// 防止瀏覽器快取造成的登出後返回問題
	onMount(() => {
		// 監聽 pageshow 事件，檢測頁面是否從快取恢復
		const handlePageShow = async (event: PageTransitionEvent) => {
			// 如果頁面是從快取恢復的
			if (event.persisted) {
				// 檢查 JWT token 是否存在
				const { getJWTToken } = await import('$lib/utils/jwt');
				const token = getJWTToken();

				// 如果頁面顯示為已登入但 token 不存在，重新載入頁面
				if (user && !token) {
					window.location.reload();
				}
			}
		};

		window.addEventListener('pageshow', handlePageShow);

		return () => {
			window.removeEventListener('pageshow', handlePageShow);
		};
	});
</script>

<svelte:head>
	<title>古董局中局 - 傳承千年智慧，品鑑古董真偽 | MOA 線上桌遊</title>
	<meta
		name="description"
		content="古董局中局線上桌遊 - 6-8人多人策略推理遊戲，無需下載App，打開瀏覽器即可開始。在神秘的古董世界中運用智慧與判斷力，與朋友一起鬥智鬥勇！"
	/>
	<meta
		name="keywords"
		content="古董局中局,桌遊,線上桌遊,多人遊戲,策略遊戲,推理遊戲,MOA,免費桌遊,網頁遊戲"
	/>
</svelte:head>

{#if showRoomForm}
	<div class="room-form-overlay">
		<RoomForm mode={roomFormMode} onCancel={closeRoomForm} />
	</div>
{/if}

{#if user}
	<!-- 已登入用戶界面 -->
	<ConfirmModal
		isOpen={$showLeaveConfirmModal}
		title="確認離開房間"
		message="確定要離開房間嗎？"
		confirmText="確認離開"
		cancelText="取消"
		isProcessing={$isLeavingRoom}
		onConfirm={() =>
			handleConfirmLeave(currentGame?.roomName || '', () => {
				currentGame = null;
			})}
		onCancel={closeLeaveConfirmModal}
	/>

	<UserArea
		userId={user.id}
		nickname={user.nickname}
		email={user.email}
		avatar={user.avatar || null}
		onLogout={logout}
		onProfileUpdate={handleProfileUpdate}
	/>

	<div class="main-content">
		<MainTitle title="古董局中局" subtitle="在這個充滿神秘色彩的古董世界中，運用您的智慧與判斷力" />

		<div class="buttons-section">
			{#if currentGame}
				<ActionButton
					variant="primary"
					title="回到房間"
					subtitle="繼續您的遊戲旅程"
					onClick={backToRoom}
				/>
				<ActionButton
					variant="destructive"
					title="離開房間"
					subtitle="退出當前的遊戲房間"
					onClick={handleLeaveRoom}
				/>
			{:else}
				<ActionButton
					variant="create"
					title="創建房間"
					subtitle="邀請朋友一起體驗古董鑑賞的樂趣"
					onClick={createRoom}
				/>
				<ActionButton
					variant="join"
					title="加入房間"
					subtitle="加入其他玩家已經創建的遊戲房間"
					onClick={joinRoom}
				/>
			{/if}
		</div>

		<p class="footer-text">傳承千年智慧，品鑑古董真偽</p>
	</div>
{:else}
	<!-- 手機版選單遮罩 -->
	{#if mobileMenuOpen}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="mobile-overlay" on:click={closeMobileMenu}></div>
	{/if}

	<!-- 未登入用戶：SEO 友好的首頁 -->
	<header class="landing-header">
		<nav class="landing-nav">
			<div class="nav-logo">古董局中局</div>

			<!-- 漢堡選單按鈕 (僅手機版顯示) -->
			<button
				class="hamburger"
				class:active={mobileMenuOpen}
				on:click={toggleMobileMenu}
				aria-label="選單"
			>
				<span></span>
				<span></span>
				<span></span>
			</button>

			<!-- 導航選單 -->
			<div class="nav-links" class:mobile-open={mobileMenuOpen}>
				<button class="nav-link" on:click={() => scrollToSection('features')}>遊戲特色</button>
				<button class="nav-link" on:click={() => scrollToSection('faq')}>常見問題</button>
				<a
					href="https://www.youtube.com/watch?v=a1scG0iv0cM"
					target="_blank"
					rel="noopener noreferrer"
					class="nav-link"
					on:click={closeMobileMenu}>教學影片</a
				>
				<a href="/auth/login" class="nav-btn nav-btn-primary" on:click={closeMobileMenu}
					>登入/註冊</a
				>
			</div>
		</nav>
	</header>

	<!-- Hero 區塊 -->
	<section class="hero-section">
		<div class="hero-content">
			<h1 class="hero-title">古董局中局</h1>
			<p class="hero-subtitle">傳承千年智慧，品鑑古董真偽</p>
			<p class="hero-description">
				在這個充滿神秘色彩的古董世界中，運用您的智慧與判斷力，<br />
				與朋友一起展開一場精彩的推理對決！
			</p>
			<div class="hero-buttons">
				<a href="/auth/register" class="hero-btn hero-btn-primary">立即開始遊戲</a>
				<a
					href="https://www.youtube.com/watch?v=a1scG0iv0cM"
					target="_blank"
					rel="noopener noreferrer"
					class="hero-btn hero-btn-secondary">觀看教學影片</a
				>
			</div>
		</div>
	</section>

	<!-- 遊戲特色 -->
	<section id="features" class="features-section">
		<div class="section-container">
			<h2 class="section-title">遊戲特色</h2>
			<div class="section-line"></div>
			<div class="features-grid">
				<article class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path
								d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
							/>
						</svg>
					</div>
					<h3>角色扮演</h3>
					<p>扮演不同身份的古董專家，每個角色都有獨特的技能與使命，體驗身份推理的樂趣。</p>
				</article>
				<article class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.35-4.35" />
							<circle cx="11" cy="11" r="3" />
						</svg>
					</div>
					<h3>邏輯推理</h3>
					<p>透過觀察、分析與推理，找出隱藏的線索，揭開古董背後的真相。</p>
				</article>
				<article class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14.5 3.5l6 6-7 7-2 2-2-2 7-7-2-2z" />
							<path d="M5.5 13.5l5 5" />
							<path d="M3 21l2-2" />
							<path d="M18 10l-3-3" />
						</svg>
					</div>
					<h3>策略博弈</h3>
					<p>與其他玩家鬥智鬥勇，運用策略欺騙或識破對手，體驗緊張刺激的心理戰。</p>
				</article>
				<article class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="2" y1="12" x2="22" y2="12" />
							<path
								d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
							/>
						</svg>
					</div>
					<h3>線上遊玩</h3>
					<p>無需安裝任何 App，打開瀏覽器即可與朋友連線遊玩，隨時隨地開局。</p>
				</article>
				<article class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					</div>
					<h3>多人互動</h3>
					<p>支援 6-8 人同時遊玩，人越多越好玩，是聚會、團建的絕佳選擇。</p>
				</article>
				<article class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<path d="M9 3v18" />
							<path d="m14 8 3 3-3 3" />
						</svg>
					</div>
					<h3>精美設計</h3>
					<p>融合中式古董美學，精心設計的介面讓您沉浸在古色古香的鑑寶氛圍中。</p>
				</article>
			</div>
		</div>
	</section>

	<!-- FAQ 區塊 -->
	<section id="faq" class="faq-section">
		<div class="section-container">
			<h2 class="section-title">常見問題</h2>
			<div class="section-line"></div>
			<div class="faq-list">
				{#each faqItems as item, index (item.question)}
					<div class="faq-item" class:expanded={expandedFaq === index}>
						<button class="faq-question" on:click={() => toggleFaq(index)}>
							<span>{item.question}</span>
							<span class="faq-icon">{expandedFaq === index ? '−' : '+'}</span>
						</button>
						{#if expandedFaq === index}
							<div class="faq-answer">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								<p>{@html item.answer}</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA 區塊 -->
	<section class="cta-section">
		<div class="cta-content">
			<h2>準備好開始您的鑑寶之旅了嗎？</h2>
			<p>立即註冊，與朋友一起體驗古董局中局的魅力！</p>
			<a href="/auth/register" class="cta-btn">立即開始遊戲</a>
		</div>
	</section>

	<!-- Footer -->
	<footer class="landing-footer">
		<div class="footer-content">
			<div class="footer-brand">
				<span class="footer-logo">古董局中局</span>
				<p>傳承千年智慧，品鑑古董真偽</p>
			</div>
			<div class="footer-links">
				<a href="/terms">使用者條款</a>
				<a
					href="https://www.youtube.com/watch?v=a1scG0iv0cM"
					target="_blank"
					rel="noopener noreferrer">教學影片</a
				>
				<a href="https://github.com/ppuff1988/moa" target="_blank" rel="noopener noreferrer"
					>GitHub</a
				>
			</div>
			<div class="footer-copyright">© 2025 MOA - 古董局中局. All rights reserved.</div>
		</div>
	</footer>
{/if}

<style>
	/* 已登入用戶的樣式（保持原有） */
	.main-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		text-align: center;
		padding: 2rem;
		position: relative;
		z-index: 1;
	}

	.buttons-section {
		display: flex;
		gap: 4rem;
		margin-bottom: 6rem;
		align-items: flex-start;
	}

	.footer-text {
		margin-top: 2rem;
		color: hsl(var(--muted-foreground));
		font-size: 1.1rem;
		font-style: italic;
		opacity: 0.8;
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		max-width: 600px;
	}

	.footer-text::before,
	.footer-text::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			hsl(var(--muted-foreground) / 0.3),
			transparent
		);
	}

	.room-form-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(5px);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 100;
	}

	/* Landing Page 樣式 */
	.landing-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		background: hsl(var(--background) / 0.9);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid hsl(var(--border) / 0.5);
	}

	.landing-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.nav-logo {
		font-size: 1.5rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		letter-spacing: 0.1em;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.nav-link {
		background: none;
		border: none;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		font-size: 0.95rem;
		transition: color 0.3s;
	}

	.nav-link:hover {
		color: hsl(var(--foreground));
	}

	.nav-btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-size: 0.95rem;
		transition: all 0.3s;
		color: hsl(var(--foreground));
	}

	.nav-btn-primary {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.nav-btn-primary:hover {
		background: hsl(var(--primary) / 0.9);
		transform: translateY(-1px);
	}

	/* 漢堡選單按鈕 */
	.hamburger {
		display: none;
		flex-direction: column;
		justify-content: space-around;
		width: 2rem;
		height: 2rem;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		z-index: 52;
	}

	.hamburger span {
		width: 100%;
		height: 3px;
		background: hsl(var(--foreground));
		border-radius: 10px;
		transition: all 0.3s linear;
		position: relative;
		transform-origin: center;
	}

	.hamburger.active span:nth-child(1) {
		transform: translateY(0.5rem) rotate(45deg);
	}

	.hamburger.active span:nth-child(2) {
		opacity: 0;
		transform: translateX(-100%);
	}

	.hamburger.active span:nth-child(3) {
		transform: translateY(-0.5rem) rotate(-45deg);
	}

	/* 手機版選單遮罩 */
	.mobile-overlay {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.2);
		z-index: 50;
		pointer-events: auto;
	}

	/* Hero Section */
	.hero-section {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6rem 2rem 4rem;
		position: relative;
		z-index: 1;
	}

	.hero-content {
		text-align: center;
		max-width: 800px;
	}

	.hero-title {
		font-size: 4.5rem;
		font-weight: 400;
		color: hsl(var(--foreground));
		margin: 0 0 1rem 0;
		letter-spacing: 0.2em;
		text-shadow: 0 4px 20px hsl(var(--background) / 0.8);
	}

	.hero-subtitle {
		font-size: 1.5rem;
		color: hsl(var(--secondary));
		margin: 0 0 1.5rem 0;
		font-style: italic;
	}

	.hero-description {
		font-size: 1.1rem;
		color: hsl(var(--muted-foreground));
		line-height: 1.8;
		margin: 0 0 2.5rem 0;
	}

	.hero-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 3rem;
	}

	.hero-btn {
		padding: 1rem 2.5rem;
		border-radius: 0.75rem;
		font-size: 1.1rem;
		font-weight: 500;
		text-decoration: none;
		transition: all 0.3s;
		cursor: pointer;
		border: none;
	}

	.hero-btn-primary {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		box-shadow: 0 4px 20px hsl(var(--primary) / 0.4);
	}

	.hero-btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 30px hsl(var(--primary) / 0.5);
	}

	.hero-btn-secondary {
		background: transparent;
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--border));
	}

	.hero-btn-secondary:hover {
		background: hsl(var(--foreground) / 0.1);
	}

	/* Section 通用樣式 */
	.section-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
	}

	.section-title {
		text-align: center;
		font-size: 2.5rem;
		font-weight: 400;
		color: hsl(var(--foreground));
		margin: 0 0 1rem 0;
		letter-spacing: 0.1em;
	}

	.section-line {
		width: 6rem;
		height: 3px;
		background: linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)));
		margin: 0 auto 3rem;
		border-radius: 2px;
	}

	/* Features Section */
	.features-section {
		padding: 6rem 0;
		position: relative;
		z-index: 1;
		background: hsl(var(--background) / 0.7);
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}

	.feature-card {
		background: hsl(var(--card) / 0.9);
		padding: 2rem;
		border-radius: 1rem;
		text-align: center;
		transition: all 0.3s;
		border: 1px solid hsl(var(--border) / 0.3);
	}

	.feature-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 10px 40px hsl(var(--background) / 0.5);
	}

	.feature-icon {
		width: 4rem;
		height: 4rem;
		margin: 0 auto 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: hsl(var(--primary));
	}

	.feature-icon svg {
		width: 100%;
		height: 100%;
		stroke-width: 1.5;
	}

	.feature-card h3 {
		color: hsl(var(--card-foreground));
		font-size: 1.25rem;
		margin: 0 0 0.75rem 0;
	}

	.feature-card p {
		color: hsl(var(--muted-foreground));
		font-size: 0.95rem;
		line-height: 1.6;
		margin: 0;
	}

	/* FAQ Section */
	.faq-section {
		padding: 6rem 0;
		position: relative;
		z-index: 1;
		background: hsl(var(--background) / 0.7);
	}

	.faq-list {
		max-width: 800px;
		margin: 0 auto;
	}

	.faq-item {
		background: hsl(var(--card) / 0.9);
		border-radius: 0.75rem;
		margin-bottom: 1rem;
		overflow: hidden;
		border: 1px solid hsl(var(--border) / 0.3);
	}

	.faq-question {
		width: 100%;
		padding: 1.25rem 1.5rem;
		background: none;
		border: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		color: hsl(var(--card-foreground));
		font-size: 1.05rem;
		font-weight: 500;
		text-align: left;
		transition: background 0.3s;
	}

	.faq-question:hover {
		background: hsl(var(--muted) / 0.3);
	}

	.faq-icon {
		font-size: 1.5rem;
		color: hsl(var(--primary));
	}

	.faq-answer {
		padding: 0 1.5rem 1.25rem;
	}

	.faq-answer p {
		color: hsl(var(--muted-foreground));
		line-height: 1.7;
		margin: 0;
	}

	/* CTA Section */
	.cta-section {
		padding: 6rem 2rem;
		position: relative;
		z-index: 1;
	}

	.cta-content {
		max-width: 600px;
		margin: 0 auto;
		text-align: center;
		background: hsl(var(--card) / 0.9);
		padding: 3rem;
		border-radius: 1.5rem;
		border: 1px solid hsl(var(--border) / 0.3);
	}

	.cta-content h2 {
		color: hsl(var(--card-foreground));
		font-size: 1.75rem;
		margin: 0 0 1rem 0;
	}

	.cta-content p {
		color: hsl(var(--muted-foreground));
		margin: 0 0 2rem 0;
	}

	.cta-btn {
		display: inline-block;
		padding: 1rem 3rem;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		text-decoration: none;
		border-radius: 0.75rem;
		font-size: 1.1rem;
		font-weight: 500;
		transition: all 0.3s;
		box-shadow: 0 4px 20px hsl(var(--primary) / 0.4);
	}

	.cta-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 30px hsl(var(--primary) / 0.5);
	}

	/* Footer */
	.landing-footer {
		background: hsl(var(--background));
		border-top: 1px solid hsl(var(--border) / 0.5);
		padding: 3rem 2rem;
		position: relative;
		z-index: 1;
	}

	.footer-content {
		max-width: 1200px;
		margin: 0 auto;
		text-align: center;
	}

	.footer-brand {
		margin-bottom: 1.5rem;
	}

	.footer-logo {
		font-size: 1.5rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		letter-spacing: 0.1em;
	}

	.footer-brand p {
		color: hsl(var(--muted-foreground));
		margin: 0.5rem 0 0 0;
		font-style: italic;
	}

	.footer-links {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 1.5rem;
	}

	.footer-links a {
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		transition: color 0.3s;
	}

	.footer-links a:hover {
		color: hsl(var(--foreground));
	}

	.footer-copyright {
		color: hsl(var(--muted-foreground) / 0.7);
		font-size: 0.9rem;
	}

	/* RWD */
	@media (max-width: 1024px) {
		.buttons-section {
			gap: 2rem;
		}

		.features-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.hero-title {
			font-size: 3.5rem;
		}
	}

	@media (max-width: 768px) {
		.main-content {
			padding: 1rem;
			padding-top: 5rem;
		}

		.buttons-section {
			flex-direction: column;
			gap: 3rem;
			align-items: center;
		}

		/* 手機版導航 */
		.landing-nav {
			padding: 1rem 1.5rem;
		}

		/* 顯示漢堡選單按鈕 */
		.hamburger {
			display: flex;
		}

		/* 手機版選單樣式 */
		.nav-links {
			position: fixed;
			left: -100%;
			top: 0;
			height: 100vh;
			width: 280px;
			max-width: 80vw;
			background: hsl(var(--background));
			border-right: 1px solid hsl(var(--border) / 0.5);
			flex-direction: column;
			align-items: flex-start;
			padding: 5rem 2rem 2rem;
			gap: 1.5rem;
			transition: left 0.3s ease-in-out;
			z-index: 51;
			box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
		}

		.nav-links.mobile-open {
			left: 0;
		}

		.nav-link,
		.nav-btn {
			width: 100%;
			text-align: left;
			padding: 0.75rem 1rem;
			border-radius: 0.5rem;
		}

		.nav-link {
			font-size: 1.1rem;
		}

		.nav-btn {
			text-align: center;
		}

		.mobile-overlay {
			display: block;
			pointer-events: auto;
		}

		/* Hero Section */
		.hero-section {
			padding-top: 8rem;
		}

		.hero-title {
			font-size: 2.5rem;
			letter-spacing: 0.1em;
		}

		.hero-subtitle {
			font-size: 1.2rem;
		}

		.hero-description {
			font-size: 1rem;
		}

		.hero-description br {
			display: none;
		}

		.hero-buttons {
			flex-direction: column;
			align-items: center;
		}

		.hero-btn {
			width: 100%;
			max-width: 280px;
		}

		.section-title {
			font-size: 2rem;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.cta-content {
			padding: 2rem 1.5rem;
		}

		.cta-content h2 {
			font-size: 1.5rem;
		}

		/* Footer 手機版優化 */
		.footer-links {
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap: 0.75rem 1.5rem;
			margin-bottom: 1.5rem;
		}

		.footer-links a {
			font-size: 0.9rem;
		}

		.footer-brand p {
			font-size: 0.9rem;
		}

		.footer-copyright {
			font-size: 0.85rem;
		}
	}
</style>
