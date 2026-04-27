<script lang="ts">
	import type { Archetype } from '$lib/scoring';

	interface Props {
		id: string;
		numeral: 'I' | 'II' | 'III' | 'IV';
		title: string;
		archetype: Archetype;
		count: number;
	}

	const { id, numeral, title, archetype, count }: Props = $props();
</script>

<div
	class="chapter"
	data-archetype={archetype}
	style:--accent="var(--vert-{archetype}-mid)"
	style:--accent-ink="var(--vert-{archetype}-ink)"
>
	<span aria-hidden="true" class="chapter__numeral">{numeral}</span>
	<div class="chapter__inner">
		<div class="chapter__rule" aria-hidden="true"></div>
		<p class="chapter__kicker">
			Chapter {numeral} · {count} statements
		</p>
		<h2 {id} class="chapter__title">
			<em>{title}</em>
		</h2>
	</div>
</div>

<style>
	.chapter {
		position: relative;
		min-height: clamp(280px, 50dvh, 520px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(48px, 8vh, 96px) 24px clamp(32px, 4vh, 56px);
		isolation: isolate;
		overflow: hidden;
		color: var(--ink);
	}

	.chapter__numeral {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(200px, 32vw, 400px);
		line-height: 0.8;
		letter-spacing: -0.06em;
		color: var(--accent-ink);
		opacity: 0.07;
		pointer-events: none;
		user-select: none;
		z-index: 0;
	}

	.chapter__inner {
		position: relative;
		z-index: 1;
		max-width: 760px;
		text-align: center;
	}

	.chapter__rule {
		width: 80px;
		height: 2px;
		margin: 0 auto 28px;
		background: var(--accent);
	}

	.chapter__kicker {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--accent-ink);
		margin: 0 0 24px;
	}

	.chapter__title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(40px, 6.5vw, 80px);
		line-height: 0.96;
		letter-spacing: -0.03em;
		margin: 0;
		text-wrap: balance;
	}

	.chapter__title em {
		font-style: italic;
		color: var(--accent-ink);
	}
</style>
