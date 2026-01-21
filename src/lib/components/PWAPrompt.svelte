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
		class="bottom-4 right-4 max-w-md rounded-lg bg-gray-900 p-4 shadow-lg border-gray-700 fixed z-50 border"
		role="alert"
	>
		<div class="gap-4 flex items-start">
			<div class="flex-1">
				{#if offlineReady}
					<h3 class="font-semibold text-white mb-1">✅ 離線模式已就緒</h3>
					<p class="text-sm text-gray-300">應用程式現在可以離線使用</p>
				{:else if needRefresh}
					<h3 class="font-semibold text-white mb-1">🎉 新版本可用</h3>
					<p class="text-sm text-gray-300">點擊更新以使用最新版本</p>
				{/if}
			</div>

			<div class="gap-2 flex">
				{#if needRefresh}
					<button
						onclick={updateApp}
						class="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
					>
						更新
					</button>
				{/if}
				<button
					onclick={close}
					class="px-3 py-1 text-sm font-medium text-gray-300 hover:text-white transition-colors"
				>
					關閉
				</button>
			</div>
		</div>
	</div>
{/if}
