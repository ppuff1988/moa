<script lang="ts">
	import DiscussionDialog from './DiscussionDialog.svelte';
	import { claimLabels, emptyNote, zodiacImage } from '$lib/utils/discussion';
	import type {
		DiscussionData,
		DiscussionPlayer,
		NoteChange,
		ArtifactClaim
	} from '$lib/types/discussion';
	import type { NoteEntry } from '$lib/stores/discussionNotes';
	let {
		data,
		players,
		entries,
		expanded = $bindable(null),
		onedit,
		onretry,
		onresolve
	}: {
		data: DiscussionData;
		players: DiscussionPlayer[];
		entries: Record<string, NoteEntry>;
		expanded: number | null;
		onedit: (id: number, change: NoteChange, debounce?: boolean) => void;
		onretry: (id: number) => void;
		onresolve: (id: number, choice: 'cloud' | 'mine') => void;
	} = $props();
	let choosing: { player: DiscussionPlayer; artifact: { id: number; animal: string } } | null =
		$state(null);
	const getNote = (id: number) => entries[`${data.round}:${id}`]?.note ?? emptyNote(id);
	function summary(id: number) {
		const note = getNote(id);
		if (note.claimedAttacked) return '自述被攻擊・本輪無法鑑定';
		const labels = data.artifacts
			.filter((a) => note.artifactClaims[a.id])
			.map((a) => `${a.animal}：${claimLabels[note.artifactClaims[a.id]]}`);
		if (!labels.length && note.memo) labels.push('有備註');
		return labels.join('／') || '尚未記錄';
	}
	function choose(value: ArtifactClaim | 'attacked' | null) {
		if (!choosing) return;
		onedit(
			choosing.player.playerId,
			value === 'attacked'
				? {
						field: 'claimedAttacked',
						value: true
					}
				: {
						field: 'artifact',
						artifactId: choosing.artifact.id,
						value
					}
		);
		choosing = null;
	}
</script>

<div class="note-list">
	{#each players as player (player.playerId)}
		{@const note = getNote(player.playerId)}
		{@const entry = entries[`${data.round}:${player.playerId}`]}
		<section class="player-note">
			<button
				type="button"
				class="player-heading"
				aria-expanded={expanded === player.playerId}
				onclick={() => (expanded = expanded === player.playerId ? null : player.playerId)}
			>
				<span class="speaking">發言 {player.speakingPosition ?? '—'}</span>
				<span class="dot" style:background={player.colorCode ?? '#aaa'}></span>
				<span class="player-copy"
					><strong>{player.nickname}{player.playerId === data.ownerPlayerId ? '（你）' : ''}</strong
					>
					<span class="position"
						>{player.actionPosition ? `第 ${player.actionPosition} 位行動` : '尚未行動'}</span
					>
					<small>{summary(player.playerId)}</small></span
				>
				<span aria-hidden="true">{expanded === player.playerId ? '⌃' : '⌄'}</span>
			</button>
			{#if expanded === player.playerId}
				<div class="editor">
					{#each data.artifacts as artifact (artifact.id)}
						{@const claim = note.claimedAttacked ? undefined : note.artifactClaims[artifact.id]}
						<div class="artifact-row">
							<img src={zodiacImage(artifact.animal)} alt="" /><span>{artifact.animal}首</span>
							<button
								type="button"
								class:genuine={claim === 'genuine'}
								class:fake={claim === 'fake'}
								disabled={!data.editable}
								aria-label={`記錄${player.nickname}的${artifact.animal}首說法`}
								onclick={() => (choosing = { player, artifact })}
								>{note.claimedAttacked ? '被攻擊' : claim ? claimLabels[claim] : '未記錄'}<span
									aria-hidden="true">⌄</span
								></button
							>
						</div>
					{/each}
					<label class="memo"
						>備註（選填）
						<textarea
							rows="2"
							maxlength="500"
							value={note.memo}
							disabled={!data.editable}
							oninput={(event) => {
								if (!(event instanceof InputEvent && event.isComposing))
									onedit(
										player.playerId,
										{ field: 'memo', value: event.currentTarget.value },
										true
									);
							}}
							oncompositionend={(event) =>
								onedit(player.playerId, { field: 'memo', value: event.currentTarget.value }, true)}
						></textarea>
					</label>
				</div>
			{/if}
			{#if entry?.status === 'error'}
				<div class="save-message" role="status">
					<span>{entry.message || '尚未同步'}</span><button
						type="button"
						disabled={!data.editable}
						onclick={() => onretry(player.playerId)}>重試</button
					>
				</div>
			{:else if entry?.status === 'conflict'}
				<div class="save-message" role="status">
					<p>另一個分頁或裝置已修改此筆記，本次輸入仍保留。</p>
					<button type="button" onclick={() => onresolve(player.playerId, 'cloud')}
						>使用雲端版本</button
					>
					<button
						type="button"
						disabled={!data.editable}
						onclick={() => onresolve(player.playerId, 'mine')}>保留本次修改</button
					>
				</div>
			{/if}
		</section>
	{/each}
</div>
<DiscussionDialog
	open={choosing !== null}
	onclose={() => (choosing = null)}
	title={choosing ? `${choosing.player.nickname}的${choosing.artifact.animal}首說法` : '獸首說法'}
>
	<div class="choices">
		{#each Object.entries(claimLabels) as [value, label] (value)}<button
				type="button"
				onclick={() => choose(value as ArtifactClaim)}>{label}</button
			>{/each}
		<button type="button" onclick={() => choose('attacked')}>被攻擊（無法鑑定）</button>
		<button type="button" onclick={() => choose(null)}>清除紀錄</button>
	</div>
	<p class="choice-hint">
		被攻擊會套用至此玩家整輪，清除本輪獸首說法；改選其他狀態或清除紀錄會取消整輪被攻擊。備註會保留。
	</p>
</DiscussionDialog>

<style>
	.note-list {
		display: grid;
		gap: 8px;
	}
	.player-note {
		border: 1px solid #79633c99;
		border-radius: 12px;
		background: #24221ebf;
		overflow: hidden;
	}
	button {
		min-height: 44px;
		color: inherit;
		cursor: pointer;
	}
	button:disabled {
		cursor: default;
		opacity: 0.65;
	}
	.player-heading {
		display: flex;
		width: 100%;
		text-align: left;
		align-items: center;
		gap: 10px;
		padding: 12px;
		background: transparent;
		border: 0;
	}
	.speaking {
		font-size: 0.75rem;
		white-space: nowrap;
		color: #d8c39e;
	}
	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid #ffffff50;
		flex: none;
	}
	.player-copy {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 10px;
	}
	strong {
		overflow-wrap: anywhere;
	}
	.position {
		font-size: 0.75rem;
		padding: 2px 6px;
		border: 1px solid #79633c;
		color: #dec18a;
		border-radius: 5px;
	}
	small {
		width: 100%;
		color: #c8c1b4;
		overflow-wrap: anywhere;
		font-size: 0.875rem;
	}
	.editor {
		padding: 12px;
		border-top: 1px solid #79633c55;
	}
	.artifact-row {
		display: grid;
		grid-template-columns: 44px 1fr minmax(115px, 48%);
		gap: 8px;
		align-items: center;
		margin-bottom: 8px;
	}
	.artifact-row img {
		width: 44px;
		height: 44px;
		object-fit: cover;
		border-radius: 6px;
	}
	.artifact-row button {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #ffffff06;
		border: 1px solid #79633c;
		border-radius: 8px;
		padding: 8px 12px;
	}
	.genuine {
		color: #99cdaa;
	}
	.fake {
		color: #ee9c8b;
	}
	.choice-hint {
		color: #c8c1b4;
		font-size: 0.875rem;
		line-height: 1.6;
	}
	.memo {
		margin-top: 12px;
		display: grid;
		gap: 8px;
		color: #c8c1b4;
		font-size: 0.875rem;
	}
	textarea {
		resize: vertical;
		width: 100%;
		font-size: 1rem;
		line-height: 1.6;
		padding: 10px;
		color: #f5f1e8;
		background: #ffffff06;
		border: 1px solid #79633c;
		border-radius: 8px;
	}
	.choices {
		display: grid;
		gap: 10px;
	}
	.choices button,
	.save-message button {
		padding: 10px;
		border: 1px solid #79633c;
		border-radius: 8px;
		background: #ffffff08;
		color: #f5f1e8;
	}
	.save-message {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 12px;
		color: #e5cb9c;
		font-size: 0.875rem;
	}
	.save-message p {
		width: 100%;
	}
	@media (min-width: 1024px) {
		.editor {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px 20px;
		}
		.artifact-row {
			margin-bottom: 0;
		}
		.memo {
			grid-column: 1 / -1;
		}
	}
</style>
