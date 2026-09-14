<script lang="ts">
	import { onMount } from 'svelte';

	let needRefresh = $state(false);
	let offlineReady = $state(false);
	let updateServiceWorker: (() => Promise<void>) | undefined;

	onMount(async () => {
		try {
			const { pwaInfo } = await import('virtual:pwa-info' as string);

			if (pwaInfo) {
				const { registerSW } = await import('virtual:pwa-register' as string);

				updateServiceWorker = registerSW({
					immediate: true,
					onRegisteredSW(swUrl: string) {
						console.log('SW 已註冊:', swUrl);
					},
					onOfflineReady() {
						offlineReady = true;
						console.log('PWA 應用已準備好離線使用');
						// 離線就緒只是資訊性通知，3 秒後自動關閉
						setTimeout(() => {
							offlineReady = false;
						}, 3000);
					},
					onNeedRefresh() {
						needRefresh = true;
						console.log('PWA 應用有新版本可用');
					},
					onRegisterError(err: Error) {
						console.error('SW 註冊錯誤:', err);
					}
				});
			}
		} catch {
			// PWA 功能未啟用或在開發環境中
			console.log('PWA 功能未啟用');
		}
	});

	async function updateApp() {
		if (updateServiceWorker) {
			await updateServiceWorker();
			needRefresh = false;
		}
	}

	function close() {
		offlineReady = false;
		needRefresh = false;
	}
</script>

{#if needRefresh || offlineReady}
	<div
		class="fixed right-4 bottom-4 z-50 max-w-md rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-lg"
		role="alert"
	>
		<div class="flex items-start gap-4">
			<div class="flex-1">
				{#if offlineReady}
					<h3 class="mb-1 font-semibold text-white">✅ 離線模式已就緒</h3>
					<p class="text-sm text-gray-300">應用程式現在可以離線使用</p>
				{:else if needRefresh}
					<h3 class="mb-1 font-semibold text-white">🎉 新版本可用</h3>
					<p class="text-sm text-gray-300">點擊更新以使用最新版本</p>
				{/if}
			</div>

			<div class="flex gap-2">
				{#if needRefresh}
					<button
						onclick={updateApp}
						class="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						更新
					</button>
				{/if}
				<button
					onclick={close}
					class="px-3 py-1 text-sm font-medium text-gray-300 transition-colors hover:text-white"
				>
					關閉
				</button>
			</div>
		</div>
	</div>
{/if}
