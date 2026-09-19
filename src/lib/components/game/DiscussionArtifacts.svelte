<script lang="ts">
	import type { DiscussionData } from '$lib/types/discussion';
	import { claimLabels, zodiacImage } from '$lib/utils/discussion';
	let { artifacts, myClaims }: Pick<DiscussionData, 'artifacts' | 'myClaims'> = $props();
</script>

<section class="round-artifacts" aria-label="本輪獸首・我的鑑定">
	<header>
		<h3>本輪獸首</h3>
		<span>我的鑑定</span>
	</header>
	<ul>
		{#each artifacts as artifact (artifact.id)}
			{@const claim = myClaims[artifact.id]}
			{@const result = claim ? claimLabels[claim] : '未鑑定'}
			<li aria-label={`${artifact.animal}首：${result}`}>
				<div class="animal">
					<img src={zodiacImage(artifact.animal)} alt="" /><span>{artifact.animal}</span>
				</div>
				<span
					class="result"
					class:genuine={claim === 'genuine'}
					class:fake={claim === 'fake'}
					class:unable={claim === 'unable'}>{result}</span
				>
			</li>
		{/each}
	</ul>
</section>

<style>
	.round-artifacts {
		background: rgba(255, 255, 255, 0.075);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 12px;
		backdrop-filter: blur(10px);
		padding: 10px;
		min-width: 0;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 8px;
	}
	h3 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
	}
	header > span {
		color: #c8c1b4;
		font-size: 0.75rem;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: grid;
		justify-items: center;
		gap: 6px;
		min-width: 0;
	}
	.animal {
		display: flex;
		gap: 4px;
		align-items: center;
		font-size: 0.875rem;
	}
	img {
		width: 30px;
		height: 30px;
		border-radius: 5px;
		object-fit: cover;
	}
	.result {
		font-size: 0.75rem;
		line-height: 1.5;
		color: #c8c1b4;
		white-space: nowrap;
		padding: 1px 4px;
		border-radius: 4px;
	}
	.genuine {
		color: #a8dbb8;
		background: #75b88820;
	}
	.fake {
		color: #f0b1a3;
		background: #e18e7720;
	}
	.unable {
		color: #e4cf9e;
		background: #c6a66420;
	}
</style>
