<script lang="ts">
	import { onMount } from 'svelte';
	import Navigation from '$lib/components/ui/Navigation.svelte';

	onMount(() => {
		// 滾動到頂部
		window.scrollTo(0, 0);
	});
</script>

<svelte:head>
	<title>使用者條款 - MOA</title>
</svelte:head>

<Navigation />

<div class="terms-container">
	<div class="terms-content">
		<h1>使用者條款</h1>

		<div class="last-updated">最後更新日期：2025年11月6日</div>

		<section>
			<h2>1. 接受條款</h2>
			<p>
				歡迎使用
				MOA（以下簡稱「本服務」）。使用本服務即表示您同意遵守以下使用者條款。如果您不同意這些條款，請勿使用本服務。
			</p>
		</section>

		<section>
			<h2>2. 服務說明</h2>
			<p>
				MOA
				是一個線上多人遊戲平台，提供玩家進行互動遊戲的服務。我們保留隨時修改、暫停或終止服務的權利，恕不另行通知。
			</p>
		</section>

		<section>
			<h2>3. 使用者帳號</h2>
			<p>
				註冊帳號時，您必須提供真實、準確的資訊。您有責任維護帳號的安全性，並對所有透過您的帳號進行的活動負責。
			</p>
			<ul>
				<li>您必須年滿 13 歲才能使用本服務</li>
				<li>每位使用者僅能註冊一個帳號</li>
				<li>不得與他人共用您的帳號</li>
				<li>如發現帳號遭到未經授權的使用，請立即通知我們</li>
			</ul>
		</section>

		<section>
			<h2>4. 使用規範</h2>
			<p>使用本服務時，您同意不會：</p>
			<ul>
				<li>發布任何違法、騷擾、誹謗、辱罵、威脅、有害、粗俗、淫穢或其他不當的內容</li>
				<li>冒充他人或虛報您與任何人或實體的關係</li>
				<li>上傳含有病毒、木馬程式或其他惡意代碼的檔案</li>
				<li>干擾或破壞本服務或與本服務相關的伺服器和網路</li>
				<li>使用任何自動化工具（如機器人、爬蟲）存取本服務</li>
				<li>進行任何可能損害本服務或其他使用者的行為</li>
			</ul>
		</section>

		<section>
			<h2>5. 智慧財產權</h2>
			<p>
				本服務及其所有內容、功能和特色的所有權利、所有權和利益（包括但不限於軟體、文字、圖像、圖形、標誌和商標）均屬於
				MOA 或其授權人所有。
			</p>
		</section>

		<section>
			<h2>6. 隱私政策</h2>
			<p>
				我們重視您的隱私。使用本服務時收集的個人資訊將按照我們的隱私政策處理。註冊即表示您同意我們收集和使用您的資訊。
			</p>
		</section>

		<section>
			<h2>7. 免責聲明</h2>
			<p>
				本服務按「現狀」提供，不提供任何明示或暗示的保證。我們不保證服務不會中斷、及時、安全或無錯誤。
			</p>
		</section>

		<section>
			<h2>8. 責任限制</h2>
			<p>
				在法律允許的最大範圍內，MOA
				及其關聯公司、董事、員工或代理人對於因使用或無法使用本服務而產生的任何直接、間接、偶然、特殊或後果性損害概不負責。
			</p>
		</section>

		<section>
			<h2>9. 帳號終止</h2>
			<p>
				我們保留在不事先通知的情況下，因任何原因暫停或終止您的帳號和存取本服務權限的權利，包括但不限於違反這些條款的行為。
			</p>
		</section>

		<section>
			<h2>10. 條款變更</h2>
			<p>
				我們可能會不時更新這些條款。變更後的條款將在本頁面公布，並標註最後更新日期。繼續使用本服務即表示您接受修改後的條款。
			</p>
		</section>

		<section>
			<h2>11. 聯絡我們</h2>
			<p>
				如對本使用者條款有任何疑問，請聯絡客服信箱：<a href="mailto:support@moa.sportify.tw"
					>support@moa.sportify.tw</a
				>
			</p>
		</section>

		<div class="back-link">
			<a href="/auth/register">← 返回註冊頁面</a>
		</div>
	</div>
</div>

<style>
	.terms-container {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		padding: 6rem 1rem 4rem 1rem;
	}

	.terms-content {
		position: relative;
		z-index: 2;
		max-width: 800px;
		margin: 0 auto;
		background: hsl(var(--card));
		padding: 3rem;
		border-radius: calc(var(--radius) * 2);
		box-shadow: var(--shadow-antique);
	}

	h1 {
		color: hsl(var(--card-foreground));
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		text-align: center;
		text-shadow: 0 2px 4px hsl(var(--background) / 0.2);
	}

	.last-updated {
		text-align: center;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 2px solid hsl(var(--border));
	}

	section {
		margin-bottom: 2rem;
	}

	h2 {
		color: hsl(var(--card-foreground));
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1rem;
		margin-top: 1.5rem;
	}

	p {
		color: hsl(var(--muted-foreground));
		line-height: 1.8;
		margin-bottom: 1rem;
		font-size: 1rem;
	}

	p a {
		color: hsl(var(--primary));
		text-decoration: none;
		font-weight: 500;
		transition: var(--transition-elegant);
	}

	p a:hover {
		color: hsl(var(--ring));
		text-decoration: underline;
	}

	ul {
		color: hsl(var(--muted-foreground));
		line-height: 1.8;
		margin-left: 1.5rem;
		margin-bottom: 1rem;
	}

	li {
		margin-bottom: 0.5rem;
	}

	.back-link {
		margin-top: 3rem;
		margin-bottom: 2rem;
		padding-top: 2rem;
		border-top: 2px solid hsl(var(--border));
		text-align: center;
	}

	.back-link a {
		color: hsl(var(--primary));
		text-decoration: none;
		font-size: 1rem;
		font-weight: 500;
		transition: var(--transition-elegant);
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back-link a:hover {
		color: hsl(var(--ring));
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.terms-content {
			padding: 2rem 1.5rem;
		}

		h1 {
			font-size: 2rem;
		}

		h2 {
			font-size: 1.3rem;
		}
	}
</style>
