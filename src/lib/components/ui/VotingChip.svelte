<script lang="ts">
	interface Props {
		colorCode: string;
		layers?: number;
		size?: 'small' | 'medium';
		muted?: boolean;
		label?: string;
	}

	let { colorCode, layers = 1, size = 'medium', muted = false, label }: Props = $props();

	let visibleLayers = $derived(Math.min(3, Math.max(1, layers)));
</script>

<span
	class="voting-chip"
	class:small={size === 'small'}
	class:muted
	style:--chip-color={colorCode}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	{#each [0, 1, 2].slice(0, visibleLayers) as layer (layer)}
		<span class="chip-layer" style={`--chip-layer: ${layer}`}>
			<span class="chip-color"></span>
			<img src="/voting-chip.png" alt="" class="chip-texture" />
		</span>
	{/each}
</span>

<style>
	.voting-chip {
		display: inline-block;
		position: relative;
		width: 5rem;
		height: 3.25rem;
		isolation: isolate;
		filter: drop-shadow(0 0.45rem 0.45rem rgba(12, 8, 5, 0.42));
	}

	.voting-chip.small {
		width: 2.4rem;
		height: 1.65rem;
		filter: drop-shadow(0 0.2rem 0.18rem rgba(12, 8, 5, 0.38));
	}

	.voting-chip.muted {
		opacity: 0.22;
		filter: grayscale(0.7) drop-shadow(0 0.25rem 0.3rem rgba(12, 8, 5, 0.3));
	}

	.chip-layer {
		position: absolute;
		left: 0;
		bottom: calc(var(--chip-layer) * 0.28rem);
		width: 100%;
		aspect-ratio: 3 / 2;
		isolation: isolate;
	}

	.small .chip-layer {
		bottom: calc(var(--chip-layer) * 0.14rem);
	}

	.chip-color,
	.chip-texture {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.chip-color {
		background: var(--chip-color);
		-webkit-mask: url('/voting-chip.png') center / contain no-repeat;
		mask: url('/voting-chip.png') center / contain no-repeat;
	}

	.chip-texture {
		object-fit: contain;
		filter: grayscale(1) contrast(1.08);
		mix-blend-mode: luminosity;
		pointer-events: none;
	}
</style>
