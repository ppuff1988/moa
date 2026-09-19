<script lang="ts">
	import type { DiscussionData } from '$lib/types/discussion';
	import type { NoteEntry } from '$lib/stores/discussionNotes';
	import { claimLabels, zodiacImage } from '$lib/utils/discussion';
	let { data, entries }: { data: DiscussionData; entries: Record<string, NoteEntry> } = $props();
	const players = $derived(
		[...data.players].sort((a, b) => (a.actionPosition ?? 99) - (b.actionPosition ?? 99))
	);
</script>

<div class="artifacts">
	{#each data.artifacts as artifact, index (artifact.id)}
		<details open={index === 0}>
			<summary
				><img src={zodiacImage(artifact.animal)} alt="" />{artifact.animal}首<span>說法對照</span
				></summary
			>
			<ul>
				{#each players as player (player.playerId)}
					{@const note = entries[`${data.round}:${player.playerId}`]?.note}
					{@const claim = note?.claimedAttacked ? undefined : note?.artifactClaims[artifact.id]}
					<li>
						<div>
							<strong>{player.nickname}</strong><small
								>{player.actionPosition ? `第 ${player.actionPosition} 位行動` : '尚未行動'} · 發言 {player.speakingPosition ??
									'—'}</small
							>
						</div>
						<span class:genuine={claim === 'genuine'} class:fake={claim === 'fake'}
							>{note?.claimedAttacked
								? '被攻擊・無法鑑定'
								: claim
									? claimLabels[claim]
									: '未記錄'}</span
						>
					</li>
				{/each}
			</ul>
			<p>
				我的鑑定：{data.myClaims[artifact.id] ? claimLabels[data.myClaims[artifact.id]] : '未鑑定'}
			</p>
		</details>
	{/each}
</div>

<style>
	.artifacts {
		display: grid;
		gap: 10px;
	}
	details {
		background: #24221ebf;
		border: 1px solid #79633c99;
		border-radius: 12px;
		padding: 12px;
	}
	summary {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		cursor: pointer;
		font-weight: 600;
	}
	summary img {
		width: 44px;
		height: 44px;
		object-fit: cover;
		border-radius: 6px;
	}
	summary span {
		margin-left: auto;
		color: #c6a664;
		font-size: 0.875rem;
	}
	ul {
		padding: 0;
		margin: 12px 0;
		list-style: none;
	}
	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid #ffffff15;
	}
	li div {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	li > span {
		flex-shrink: 0;
	}
	small {
		display: block;
		color: #c8c1b4;
		font-size: 0.8rem;
	}
	p {
		padding-top: 8px;
		color: #ddcba9;
	}
	.genuine {
		color: #99cdaa;
	}
	.fake {
		color: #ee9c8b;
	}
</style>
