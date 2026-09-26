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
					<img src={zodiacImage(artifact.animal)} alt="" /><span
						>{artifact.animal}<span class="suffix">首</span></span
					>
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
		background: #24221ed9;
		border: 1px solid #79633c99;
		border-radius: 12px;
		backdrop-filter: blur(10px);
		padding: 12px;
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
	.suffix {
		display: none;
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
	@media (min-width: 1024px) {
		.round-artifacts {
			padding: 16px;
		}
		header {
			margin-bottom: 18px;
		}
		h3 {
			font-size: 1rem;
		}
		ul {
			gap: 0;
		}
		li {
			gap: 10px;
			padding: 0 4px;
		}
		li + li {
			border-left: 1px solid #79633c40;
		}
		.animal {
			flex-direction: column;
			gap: 8px;
			font-size: 0.9375rem;
		}
		.suffix {
			display: inline;
		}
		img {
			width: 48px;
			height: 48px;
			border-radius: 8px;
		}
		.result {
			padding: 3px 4px;
			font-size: 0.8125rem;
		}
	}
</style>
