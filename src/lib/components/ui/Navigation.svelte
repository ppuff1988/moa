<script lang="ts">
	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<!-- 手機版選單遮罩 -->
{#if mobileMenuOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="mobile-overlay" onclick={closeMobileMenu}></div>
{/if}

<!-- 導航選單 -->
<header class="landing-header">
	<nav class="landing-nav">
		<a href="/" class="nav-logo">古董局中局</a>

		<!-- 漢堡選單按鈕 (僅手機版顯示) -->
		<button
			class="hamburger"
			class:active={mobileMenuOpen}
			onclick={toggleMobileMenu}
			aria-label="選單"
		>
			<span></span>
			<span></span>
			<span></span>
		</button>

		<!-- 導航選單 -->
		<div class="nav-links" class:mobile-open={mobileMenuOpen}>
			<a href="/" class="nav-link" onclick={closeMobileMenu}>首頁</a>
			<a
				href="https://www.youtube.com/watch?v=a1scG0iv0cM"
				target="_blank"
				rel="noopener noreferrer"
				class="nav-link"
				onclick={closeMobileMenu}>教學影片</a
			>
			<a href="/terms" class="nav-link" onclick={closeMobileMenu}>使用者條款</a>
			<a href="/auth/login" class="nav-btn nav-btn-primary" onclick={closeMobileMenu}>登入/註冊</a>
		</div>
	</nav>
</header>

<style>
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
		text-decoration: none;
		transition: color 0.3s;
	}

	.nav-logo:hover {
		color: hsl(var(--primary));
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
		text-decoration: none;
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

	@media (max-width: 768px) {
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
		}
	}
</style>
