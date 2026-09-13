<script lang="ts">
	import { onMount } from 'svelte';
	import { faqItems, homeSchema } from '$lib/content/home';
	import { HOME_DESCRIPTION } from '$lib/content/site';

	let hydrated = $state(false);
	let mobileMenuOpen = $state(false);
	let menuButton: HTMLButtonElement;
	const currentYear = new Date().getFullYear();
	onMount(() => {
		hydrated = true;
	});
	const tutorialUrl = 'https://www.youtube.com/watch?v=a1scG0iv0cM';
	const features = [
		{
			number: '壹',
			title: '辨物，眼見未必為真。',
			text: '十二獸首，真偽交錯。從每一次鑑定中尋找線索，拼出藏品背後的真相。'
		},
		{
			number: '貳',
			title: '識人，聽懂話外之音。',
			text: '每個身份都有自己的能力與立場。交換情報、試探盟友，也留意那些刻意隱瞞的細節。'
		},
		{
			number: '參',
			title: '破局，讓判斷成為勝負。',
			text: '線索未必完整，選擇卻已在眼前。與朋友推理、辯論，為你相信的答案投下關鍵一票。'
		}
	];
	const steps = [
		{
			number: '01',
			title: '登入，準備入席',
			text: '使用 Google 帳號或註冊登入，準備好你的玩家身份。'
		},
		{
			number: '02',
			title: '開房，邀友同局',
			text: '由一位玩家建立房間，將房間名稱與密碼分享給朋友。'
		},
		{
			number: '03',
			title: '人齊，開始鑑寶',
			text: '集合 6–8 位玩家，搭配實體桌遊，展開這一場推理對決。'
		}
	];

	function closeMenu() {
		mobileMenuOpen = false;
	}
</script>

<svelte:head>
	<svelte:element this={'script'} type="application/ld+json"
		>{JSON.stringify(homeSchema)}</svelte:element
	>
</svelte:head>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && mobileMenuOpen) {
			closeMenu();
			menuButton?.focus();
		}
	}}
/>

<div class="landing">
	<a class="skip-link" href="#main-content">跳至主要內容</a>
	<header class="landing-header">
		<nav class="landing-nav container" aria-label="主要導覽">
			<a href="/" class="nav-logo" aria-label="古董局中局首頁" aria-current="page">
				<img
					class="brand-logo"
					src="/pwa-icon-192.png"
					alt="古董局中局金色龍首 Logo"
					width="48"
					height="48"
				/>
				<span>古董局中局<small>非官方桌遊輔助工具</small></span>
			</a>
			<button
				class="menu-button"
				bind:this={menuButton}
				aria-label="選單"
				aria-expanded={mobileMenuOpen}
				aria-controls="home-navigation"
				disabled={!hydrated}
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
			>
				<span>{mobileMenuOpen ? '關閉' : '選單'}</span>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					{#if mobileMenuOpen}<path d="m6 6 12 12M6 18 18 6" />{:else}<path
							d="M4 8h16M4 16h16"
						/>{/if}
				</svg>
			</button>
			<div id="home-navigation" class="nav-links" class:mobile-open={mobileMenuOpen}>
				<a href="#features" onclick={closeMenu}>遊戲特色</a>
				<a href="#how-to-play" onclick={closeMenu}>如何開始</a>
				<a href="#faq" onclick={closeMenu}>常見問題</a>
				<a href="/auth/login" class="nav-login" onclick={closeMenu}
					>登入／註冊 <span aria-hidden="true">↗</span></a
				>
			</div>
		</nav>
	</header>

	<main id="main-content" tabindex="-1">
		<section class="hero-section" aria-labelledby="hero-title">
			<div class="hero-grid container">
				<div class="hero-copy">
					<p class="eyebrow">
						<span class="short-rule" aria-hidden="true"></span>以古董為引，以人心為局
					</p>
					<h1 id="hero-title">古董局中局</h1>
					<p class="hero-subtitle">一席古董，滿局人心。</p>
					<p class="hero-description">
						{HOME_DESCRIPTION}
					</p>
					<div class="hero-actions">
						<a href="/auth/login" class="primary-link"
							>立即開始遊戲 <span aria-hidden="true">→</span></a
						>
						<a href={tutorialUrl} target="_blank" rel="noopener noreferrer" class="text-link"
							><span class="play-icon" aria-hidden="true">▷</span>觀看教學影片</a
						>
					</div>
					<p class="companion-note">MOA 非官方輔助工具 · 建議搭配實體桌遊使用</p>
				</div>
				<figure class="artifact-scene" aria-label="十二獸首中的虎首、龍首與牛首藏品展示">
					<div class="collection-ring" aria-hidden="true"></div>
					<span class="scene-label" aria-hidden="true">十二獸首 · 真偽待辨</span>
					<div class="artifact artifact-tiger">
						<img
							src="/zodiac/zodiac_03.png"
							alt="虎首石雕，張口露齒的生肖藏品"
							width="342"
							height="384"
						/>
						<div class="artifact-label"><span>虎首</span><small>寅 · 藏品之三</small></div>
					</div>
					<div class="artifact artifact-ox">
						<img
							src="/zodiac/zodiac_02.png"
							alt="牛首石雕，帶有彎角的生肖藏品"
							width="342"
							height="384"
						/>
						<div class="artifact-label"><span>牛首</span><small>丑 · 藏品之二</small></div>
					</div>
					<div class="artifact artifact-dragon">
						<img
							src="/zodiac/zodiac_05.png"
							alt="龍首石雕，刻有細緻鱗紋與龍角的生肖藏品"
							width="342"
							height="384"
							fetchpriority="high"
						/>
						<div class="artifact-label"><span>龍首</span><small>辰 · 藏品之五</small></div>
					</div>
					<span class="appraisal-seal" aria-hidden="true">待鑑</span>
					<figcaption>藏品有真偽，人心有深淺。</figcaption>
				</figure>
			</div>
			<div class="game-facts container" aria-label="遊戲資訊">
				<div><strong>6–8 <small>人</small></strong><span>好友同席，推理交鋒</span></div>
				<div><strong>30–60 <small>分鐘</small></strong><span>一場真假難辨的對局</span></div>
				<div><strong>免下載</strong><span>打開瀏覽器，即可入局</span></div>
				<a href="#features" class="explore-link"
					>往下，細看這一局 <span aria-hidden="true">↓</span></a
				>
			</div>
		</section>

		<section
			id="features"
			class="features-section section-space container"
			aria-labelledby="features-title"
		>
			<div class="section-intro">
				<p class="eyebrow">局中有局 · 遊戲特色</p>
				<h2 id="features-title">鑑的是古董，<br />讀的是人心。</h2>
				<p>一場好局，不只考驗眼力。<br />從藏品到同桌的每一個人，<br />都有值得細讀的線索。</p>
				<div class="editorial-mark" aria-hidden="true"><span>真</span><i></i><span>偽</span></div>
			</div>
			<div class="feature-list">
				{#each features as feature (feature.number)}
					<article class="feature-row">
						<span class="feature-number" aria-hidden="true">{feature.number}</span>
						<div>
							<h3>{feature.title}</h3>
							<p>{feature.text}</p>
						</div>
					</article>
				{/each}
			</div>
		</section>

		<section id="how-to-play" class="how-section" aria-labelledby="how-title">
			<div class="section-space container">
				<div class="section-heading">
					<div>
						<p class="eyebrow">入局指南 · 如何開始</p>
						<h2 id="how-title">三步，入局。</h2>
					</div>
					<a href={tutorialUrl} target="_blank" rel="noopener noreferrer" class="text-link"
						>第一次玩？先看教學 <span aria-hidden="true">↗</span></a
					>
				</div>
				<ol class="steps">
					{#each steps as step (step.number)}
						<li>
							<span class="step-number" aria-hidden="true">{step.number}</span>
							<h3>{step.title}</h3>
							<p>{step.text}</p>
						</li>
					{/each}
				</ol>
			</div>
		</section>

		<section id="faq" class="faq-section section-space container" aria-labelledby="faq-title">
			<div class="section-heading">
				<div>
					<p class="eyebrow">入席之前 · 常見問題</p>
					<h2 id="faq-title">先解惑，再破局。</h2>
				</div>
				<p>把疑問留在這裡，把推理帶到桌上。</p>
			</div>
			<div class="faq-grid">
				{#each faqItems as item (item.question)}
					<article id={item.id} class="faq-item">
						<h3>{item.question}</h3>
						<p>{item.answer}</p>
					</article>
				{/each}
			</div>
			<p class="help-note">
				使用時遇到問題？<a
					href="https://github.com/ppuff1988/moa/issues"
					target="_blank"
					rel="noopener noreferrer">到 GitHub 回報問題 <span aria-hidden="true">↗</span></a
				>
			</p>
		</section>

		<section class="closing-section container" aria-labelledby="closing-title">
			<div>
				<p class="eyebrow">好友已候，靜待開局</p>
				<h2 id="closing-title">這一局，等你入席。</h2>
				<p>傳承千年智慧，品鑑古董真偽。</p>
			</div>
			<a href="/auth/register" class="primary-link"
				>註冊，開始第一局 <span aria-hidden="true">→</span></a
			>
		</section>
	</main>

	<footer class="landing-footer container">
		<div class="footer-top">
			<a href="/" class="footer-brand">古董局中局 <span>MOA</span></a>
			<nav class="footer-links" aria-label="頁尾導覽">
				<a href="/terms">使用者條款</a><a
					href={tutorialUrl}
					target="_blank"
					rel="noopener noreferrer">教學影片</a
				><a href="https://github.com/ppuff1988/moa" target="_blank" rel="noopener noreferrer"
					>GitHub ↗</a
				>
			</nav>
		</div>
		<div class="footer-bottom">
			<span class="footer-copyright">© {currentYear} 古董局中局非官方APP</span><span
				>為每一場相聚，留一席好局。</span
			>
		</div>
	</footer>
</div>

<style>
	.landing {
		--home-ink: hsl(38 24% 90%);
		--home-muted: hsl(35 13% 66%);
		--home-line: hsl(var(--secondary) / 0.23);
		--home-serif: 'Noto Serif TC', 'Noto Serif CJK TC', 'Songti TC', 'PMingLiU', serif;
		position: relative;
		padding-top: 5.75rem;
		color: var(--home-ink);
		background: hsl(var(--background));
		font-family:
			'Noto Sans TC', 'Noto Sans CJK TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
		font-size: 0.9375rem;
		line-height: 1.8;
	}
	.container {
		width: min(100% - 6rem, 74rem);
		margin-inline: auto;
	}
	.landing :where(h1, h2, h3, p, figure) {
		margin: 0;
	}
	.landing :where(h1, h2, h3) {
		text-wrap: balance;
	}
	.landing p {
		text-wrap: pretty;
	}
	.landing a {
		color: inherit;
		text-decoration: none;
		transition:
			color 200ms,
			background 200ms,
			transform 200ms;
	}
	.landing a:hover {
		color: hsl(var(--secondary));
	}
	.landing :where(a, button):focus-visible {
		outline: 2px solid hsl(var(--secondary));
		outline-offset: 5px;
	}
	.landing :where(a, button):active {
		transform: translateY(1px);
	}
	.landing section {
		scroll-margin-top: 7rem;
	}
	.skip-link {
		position: fixed;
		top: 0.75rem;
		left: 1rem;
		z-index: 30;
		transform: translateY(-200%);
		padding: 0.6rem 1rem;
		background: hsl(var(--background));
	}
	.skip-link:focus {
		transform: translateY(0);
	}
	.landing-header {
		position: fixed;
		top: 0;
		inset-inline: 0;
		z-index: 20;
		background: hsl(var(--background) / 0.96);
		border-bottom: 1px solid var(--home-line);
	}
	.landing-nav {
		min-height: 5.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}
	.nav-logo {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		font-family: var(--home-serif);
		font-size: 1.25rem;
		letter-spacing: 0.12em;
		font-weight: 600;
		line-height: 1.6;
	}
	.brand-logo {
		display: block;
		width: 3rem;
		height: 3rem;
		flex-shrink: 0;
	}
	.nav-logo small {
		display: block;
		color: var(--home-muted);
		font-family: sans-serif;
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.2em;
	}
	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
		font-size: 0.8125rem;
		color: var(--home-muted);
	}
	.nav-links > a {
		padding-block: 0.6rem;
	}
	.nav-links .nav-login {
		display: flex;
		gap: 1.5rem;
		padding: 0.55rem 1rem;
		color: var(--home-ink);
		border: 1px solid var(--home-line);
		border-radius: 0.25rem;
	}
	.nav-login:hover {
		background: hsl(var(--secondary) / 0.1);
	}
	.menu-button {
		display: none;
	}
	.hero-section {
		position: relative;
		isolation: isolate;
	}
	.hero-section::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			linear-gradient(90deg, hsl(var(--background) / 0.78), hsl(var(--background) / 0.58)),
			url('/background.jpg') center / cover;
		opacity: 0.8;
		mask-image: linear-gradient(#000 75%, transparent);
	}
	.hero-grid {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		align-items: center;
		gap: 2rem;
		padding-block: 5rem 4.5rem;
	}
	.eyebrow {
		color: hsl(var(--secondary));
		font-size: 0.75rem;
		letter-spacing: 0.18em;
		font-weight: 500;
	}
	.hero-copy .eyebrow {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		margin-bottom: 1.75rem;
	}
	.short-rule {
		width: 1.8rem;
		height: 1px;
		background: hsl(var(--secondary));
	}
	h1 {
		font-family: var(--home-serif);
		font-size: clamp(3rem, 5.1vw, 4.75rem);
		font-weight: 500;
		letter-spacing: 0.045em;
		line-height: 1.35;
		white-space: nowrap;
	}
	.hero-subtitle {
		margin-top: 1rem !important;
		font-family: var(--home-serif);
		color: hsl(var(--secondary));
		font-size: 1.625rem;
		letter-spacing: 0.12em;
	}
	.hero-description {
		max-width: 32rem;
		margin-top: 1.6rem !important;
		color: var(--home-muted);
		line-height: 2;
	}
	.hero-actions {
		display: flex;
		align-items: center;
		gap: 1.7rem;
		margin-top: 2.25rem;
	}
	.landing .primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		background: hsl(var(--primary));
		border: 1px solid hsl(1 50% 50% / 0.5);
		color: hsl(var(--primary-foreground));
		padding: 0.85rem 1.4rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
	}
	.landing .primary-link:hover {
		background: hsl(1 60% 48%);
		transform: translateY(-2px);
	}
	.landing .primary-link:active {
		transform: translateY(1px);
	}
	.text-link {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		padding-block: 0.6rem;
		font-size: 0.8125rem;
	}
	.play-icon {
		display: grid;
		place-items: center;
		width: 1.65rem;
		height: 1.65rem;
		border: 1px solid var(--home-line);
		border-radius: 50%;
		font-size: 0.8rem;
		padding-left: 0.1rem;
	}
	.companion-note {
		color: var(--home-muted);
		font-size: 0.6875rem;
		margin-top: 1.2rem !important;
		letter-spacing: 0.025em;
	}
	.artifact-scene {
		position: relative;
		width: 100%;
		max-width: 31rem;
		height: 28.5rem;
		justify-self: end;
	}
	.collection-ring {
		position: absolute;
		width: 82%;
		aspect-ratio: 1;
		border: 1px solid var(--home-line);
		border-radius: 50%;
		top: 2rem;
		left: 9%;
	}
	.collection-ring::after {
		content: '';
		position: absolute;
		inset: 0.7rem;
		border: 1px solid hsl(var(--secondary) / 0.08);
		border-radius: 50%;
	}
	.scene-label {
		position: absolute;
		top: 0;
		right: 0.5rem;
		font-family: var(--home-serif);
		color: hsl(var(--secondary));
		letter-spacing: 0.25em;
		font-size: 0.7rem;
		writing-mode: vertical-rl;
	}
	.artifact {
		position: absolute;
		padding: 0.5rem;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--secondary) / 0.5);
		box-shadow: 0 1rem 2rem hsl(25 20% 4% / 0.5);
	}
	.artifact img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 342 / 384;
		object-fit: cover;
		filter: sepia(0.12);
	}
	.artifact-tiger {
		width: 37%;
		left: 0;
		top: 5.3rem;
		transform: rotate(-12deg);
	}
	.artifact-ox {
		width: 37%;
		right: 0;
		top: 6.3rem;
		transform: rotate(12deg);
	}
	.artifact-dragon {
		width: 48%;
		left: 26%;
		top: 2.4rem;
		transform: rotate(-3deg);
	}
	.artifact-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 0.3rem 0.2rem;
		color: hsl(var(--card-foreground));
		font-family: var(--home-serif);
	}
	.artifact-label > span {
		font-size: 1rem;
		letter-spacing: 0.2em;
	}
	.artifact-label small {
		font-size: 0.5625rem;
		letter-spacing: 0.05em;
	}
	.appraisal-seal {
		position: absolute;
		bottom: 4.3rem;
		right: 4.6rem;
		padding: 0.25rem 0.35rem;
		border: 2px solid hsl(1 44% 53%);
		outline: 1px solid hsl(1 44% 53%);
		outline-offset: 3px;
		color: hsl(1 44% 63%);
		font: 1.4rem var(--home-serif);
		writing-mode: vertical-rl;
		transform: rotate(9deg);
	}
	.artifact-scene figcaption {
		position: absolute;
		bottom: 0.5rem;
		left: 0;
		right: 0;
		text-align: center;
		color: hsl(var(--secondary));
		font-family: var(--home-serif);
		font-size: 0.8125rem;
		letter-spacing: 0.25em;
	}
	.game-facts {
		display: grid;
		grid-template-columns: 1fr 1.15fr 1fr 1fr;
		padding-block: 1.6rem;
		border-block: 1px solid var(--home-line);
		align-items: center;
	}
	.game-facts > div {
		display: flex;
		flex-direction: column;
		padding-left: 2rem;
		border-left: 1px solid var(--home-line);
	}
	.game-facts > div:first-child {
		padding-left: 0;
		border: 0;
	}
	.game-facts strong {
		font-family: var(--home-serif);
		font-size: 1.55rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.game-facts small {
		font: 0.75rem sans-serif;
	}
	.game-facts div > span {
		color: var(--home-muted);
		font-size: 0.6875rem;
		letter-spacing: 0.05em;
	}
	.explore-link {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1.5rem;
		font-size: 0.75rem;
		color: hsl(var(--secondary)) !important;
	}
	.section-space {
		padding-block: 6rem;
	}
	h2 {
		font-family: var(--home-serif);
		font-weight: 500;
		font-size: clamp(1.8rem, 3vw, 2.625rem);
		letter-spacing: 0.04em;
		line-height: 1.6;
	}
	h3 {
		font-family: var(--home-serif);
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: 0.035em;
	}
	.features-section {
		display: grid;
		grid-template-columns: 1fr 1.2fr;
		gap: 6rem;
	}
	.section-intro h2 {
		margin-top: 1rem;
	}
	.section-intro > p:not(.eyebrow) {
		color: var(--home-muted);
		margin-top: 1.25rem;
		font-size: 0.875rem;
		line-height: 2;
	}
	.editorial-mark {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		margin-top: 2.25rem;
		font: 1.5rem var(--home-serif);
		color: hsl(var(--secondary) / 0.65);
	}
	.editorial-mark i {
		width: 4rem;
		height: 1px;
		background: var(--home-line);
	}
	.feature-row {
		display: flex;
		align-items: flex-start;
		gap: 1.75rem;
		padding-block: 1.65rem;
		border-bottom: 1px solid var(--home-line);
	}
	.feature-row:first-child {
		padding-top: 0.4rem;
	}
	.feature-number {
		color: hsl(var(--secondary));
		font: 1.4rem var(--home-serif);
		border: 1px solid var(--home-line);
		min-width: 2.75rem;
		height: 3rem;
		display: grid;
		place-items: center;
	}
	.feature-row p {
		color: var(--home-muted);
		font-size: 0.875rem;
		margin-top: 0.65rem;
		max-width: 32rem;
	}
	.how-section {
		background: hsl(32 12% 11%);
		border-block: 1px solid var(--home-line);
	}
	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 2rem;
		margin-bottom: 2.75rem;
	}
	.section-heading h2 {
		margin-top: 0.75rem;
	}
	.section-heading > p {
		font-size: 0.8125rem;
		color: var(--home-muted);
		padding-bottom: 0.6rem;
	}
	.steps {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.steps li {
		border-top: 1px solid var(--home-line);
		padding-top: 1.25rem;
	}
	.step-number {
		display: block;
		color: hsl(var(--secondary));
		font-family: var(--home-serif);
		font-size: 1.125rem;
		font-variant-numeric: tabular-nums;
		margin-bottom: 1.25rem;
	}
	.steps p {
		margin-top: 0.75rem;
		color: var(--home-muted);
		font-size: 0.875rem;
		max-width: 22rem;
	}
	.faq-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		column-gap: 4rem;
	}
	.faq-item {
		scroll-margin-top: 7rem;
		border-top: 1px solid var(--home-line);
		padding-block: 1.5rem 1.75rem;
	}
	.faq-item h3 {
		font-family: inherit;
		font-size: 0.9375rem;
		font-weight: 500;
	}
	.faq-item p {
		margin-top: 0.6rem;
		color: var(--home-muted);
		font-size: 0.8125rem;
		line-height: 1.9;
	}
	.help-note {
		margin-top: 1.5rem !important;
		font-size: 0.8125rem;
		color: var(--home-muted);
	}
	.help-note a {
		color: hsl(var(--secondary));
		display: inline-block;
		padding: 0.3rem;
		text-decoration: underline;
		text-underline-offset: 0.3em;
	}
	.closing-section {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding: 3.25rem;
		border: 1px solid var(--home-line);
		border-radius: 0.25rem;
		background:
			linear-gradient(100deg, hsl(32 17% 14% / 0.96), hsl(var(--background) / 0.85)),
			url('/background.jpg') center / cover;
	}
	.closing-section h2 {
		margin-top: 0.6rem;
	}
	.closing-section p:not(.eyebrow) {
		color: var(--home-muted);
		font-size: 0.8125rem;
		margin-top: 0.5rem;
	}
	.landing-footer {
		padding-block: 3.5rem 1.75rem;
	}
	.footer-top,
	.footer-bottom {
		display: flex;
		justify-content: space-between;
		gap: 1.5rem;
		align-items: center;
	}
	.footer-brand {
		font-family: var(--home-serif);
		letter-spacing: 0.1em;
		font-size: 1.125rem;
	}
	.footer-brand span {
		font: 0.625rem sans-serif;
		color: var(--home-muted);
		margin-left: 0.75rem;
		letter-spacing: 0.2em;
	}
	.footer-links {
		display: flex;
		gap: 1.75rem;
		font-size: 0.75rem;
		color: var(--home-muted);
	}
	.footer-links a {
		padding-block: 0.75rem;
	}
	.footer-bottom {
		border-top: 1px solid var(--home-line);
		padding-top: 1.25rem;
		margin-top: 1.25rem;
		color: var(--home-muted);
		font-size: 0.6875rem;
	}
	@media (prefers-reduced-motion: no-preference) {
		:global(html:has(.landing)) {
			scroll-behavior: smooth;
		}
		.hero-copy,
		.artifact-scene {
			animation: arrive 650ms both;
		}
		.artifact-scene {
			animation-delay: 100ms;
		}
		@keyframes arrive {
			from {
				opacity: 0;
				transform: translateY(12px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.landing :where(a, button) {
			transition: none;
		}
	}
	@media (max-width: 1100px) {
		.container {
			width: min(100% - 4rem, 74rem);
		}
		.hero-grid {
			gap: 1rem;
			padding-block: 3.5rem;
		}
		.hero-actions {
			gap: 1rem;
		}
		.artifact-scene {
			height: 26rem;
		}
		.artifact-tiger {
			top: 6rem;
		}
		.artifact-ox {
			top: 7rem;
		}
		.artifact-dragon {
			top: 4rem;
		}
		.appraisal-seal {
			bottom: 3.5rem;
			right: 3rem;
		}
		.features-section {
			gap: 3rem;
		}
		.game-facts {
			grid-template-columns: 1fr 1fr 1fr;
		}
		.explore-link {
			display: none;
		}
		.nav-links {
			gap: 1.25rem;
		}
	}
	@media (max-width: 760px) {
		.landing {
			padding-top: 4.75rem;
		}
		.container {
			width: calc(100% - 2.5rem);
		}
		.landing-nav {
			min-height: 4.75rem;
		}
		.nav-logo {
			font-size: 1rem;
			gap: 0.65rem;
		}
		.brand-logo {
			width: 2.5rem;
			height: 2.5rem;
		}
		.nav-logo small {
			font-size: 0.5625rem;
		}
		.menu-button {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			min-height: 2.75rem;
			padding: 0.5rem;
			border: 0;
			background: transparent;
			color: var(--home-ink);
			font: inherit;
			font-size: 0.75rem;
			cursor: pointer;
		}
		.menu-button svg {
			width: 1.25rem;
			height: 1.25rem;
		}
		.nav-links {
			display: none;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			padding: 1rem 1.25rem 1.5rem;
			background: hsl(var(--background));
			border-bottom: 1px solid var(--home-line);
		}
		.nav-links.mobile-open {
			display: flex;
			flex-direction: column;
			align-items: stretch;
			gap: 0.4rem;
		}
		.nav-links > a {
			padding: 0.65rem 0.75rem;
		}
		.nav-links .nav-login {
			margin-top: 0.5rem;
			justify-content: space-between;
		}
		.hero-grid {
			grid-template-columns: 1fr;
			padding-block: 2.75rem 1.5rem;
			gap: 1.75rem;
		}
		.hero-copy .eyebrow {
			font-size: 0.625rem;
			margin-bottom: 1.25rem;
		}
		h1 {
			font-size: clamp(2.5rem, 9.7vw, 4rem);
			letter-spacing: 0.06em;
		}
		.hero-subtitle {
			font-size: 1.25rem;
			margin-top: 0.75rem !important;
		}
		.hero-description {
			font-size: 0.8125rem;
			margin-top: 1.2rem !important;
		}
		.hero-actions {
			gap: 1.2rem;
			margin-top: 1.5rem;
		}
		.landing .primary-link {
			gap: 1rem;
			padding: 0.8rem 1rem;
			font-size: 0.8125rem;
		}
		.hero-actions .text-link {
			font-size: 0.75rem;
			gap: 0.4rem;
		}
		.companion-note {
			font-size: 0.625rem;
		}
		.artifact-scene {
			max-width: 24rem;
			height: 24rem;
			justify-self: center;
		}
		.artifact-dragon {
			top: 1.6rem;
		}
		.artifact-tiger {
			top: 4.5rem;
		}
		.artifact-ox {
			top: 5.5rem;
		}
		.artifact-label {
			padding-top: 0.5rem;
		}
		.artifact-label > span {
			font-size: 0.875rem;
		}
		.artifact-label small {
			font-size: 0.5rem;
		}
		.artifact-tiger small,
		.artifact-ox small {
			display: none;
		}
		.collection-ring {
			top: 1rem;
		}
		.appraisal-seal {
			bottom: 4rem;
			right: 2.5rem;
			font-size: 1.2rem;
		}
		.artifact-scene figcaption {
			bottom: 0.75rem;
			font-size: 0.75rem;
		}
		.game-facts {
			padding-block: 1.25rem;
		}
		.game-facts > div {
			padding-left: 0.75rem;
		}
		.game-facts strong {
			font-size: 1.125rem;
		}
		.game-facts small {
			font-size: 0.625rem;
		}
		.game-facts div > span {
			font-size: 0.5625rem;
			letter-spacing: 0;
		}
		.section-space {
			padding-block: 3.75rem;
		}
		.features-section {
			grid-template-columns: 1fr;
			gap: 2.5rem;
		}
		.editorial-mark {
			display: none;
		}
		.section-intro > p:not(.eyebrow) br {
			display: none;
		}
		.feature-row {
			gap: 1rem;
		}
		.feature-row h3 {
			font-size: 1.0625rem;
		}
		.feature-row p {
			font-size: 0.8125rem;
		}
		.section-heading {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.75rem;
			margin-bottom: 1.75rem;
		}
		.steps {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		.steps li {
			display: grid;
			grid-template-columns: 2rem 1fr;
			column-gap: 1rem;
		}
		.step-number {
			grid-row: span 2;
			margin: 0;
		}
		.steps p {
			margin-top: 0.5rem;
		}
		.faq-grid {
			grid-template-columns: 1fr;
		}
		.faq-item {
			padding-block: 1.25rem;
		}
		.closing-section {
			flex-direction: column;
			align-items: flex-start;
			padding: 2rem 1.5rem;
			gap: 1.5rem;
		}
		.closing-section h2 {
			font-size: 1.75rem;
		}
		.landing-footer {
			padding-top: 2.5rem;
		}
		.footer-top,
		.footer-bottom {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
		.footer-links {
			gap: 1.5rem;
		}
	}
	@media (max-width: 360px) {
		.hero-actions {
			gap: 0.85rem;
		}
		.play-icon {
			display: none;
		}
		.game-facts strong {
			font-size: 1rem;
		}
		.game-facts div > span {
			max-width: 5rem;
		}
		.artifact-scene {
			height: 21rem;
		}
	}
</style>
