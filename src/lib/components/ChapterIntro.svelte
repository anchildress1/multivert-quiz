<script lang="ts">
	import type { Archetype } from '$lib/scoring';

	interface Props {
		id: string;
		numeral: 'I' | 'II' | 'III' | 'IV';
		title: string;
		dek: string;
		archetype: Archetype;
		count: number;
		dimension: string;
	}

	const { id, numeral, title, dek, archetype, count, dimension }: Props = $props();
</script>

<section
	{id}
	class="chapter"
	style:background="var(--vert-{archetype}-soft)"
	style:--accent="var(--vert-{archetype}-mid)"
	style:--accent-ink="var(--vert-{archetype}-ink)"
>
	<span aria-hidden="true" class="chapter__numeral">{numeral}</span>
	<div class="chapter__inner">
		<div class="chapter__rule" aria-hidden="true"></div>
		<p class="chapter__kicker">
			Chapter {numeral} · {count} statements · {dimension}
		</p>
		<h2 class="chapter__title">
			On <em>{title}</em>
		</h2>
		<p class="chapter__dek">{dek}</p>
	</div>
	<div class="chapter__edge" aria-hidden="true"></div>
</section>

<style>
	.chapter {
		position: relative;
		min-height: 70vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(64px, 12vh, 160px) 24px;
		isolation: isolate;
		overflow: hidden;
		scroll-margin-top: 88px;
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
		font-size: clamp(360px, 48vw, 720px);
		line-height: 0.8;
		letter-spacing: -0.06em;
		color: var(--accent-ink);
		opacity: 0.08;
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
		font-size: clamp(56px, 11vw, 132px);
		line-height: 0.96;
		letter-spacing: -0.03em;
		margin: 0;
		text-wrap: balance;
	}

	.chapter__title em {
		font-style: italic;
		color: var(--accent-ink);
	}

	.chapter__dek {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(20px, 2.4vw, 28px);
		line-height: 1.4;
		color: var(--ink-70);
		margin: 28px auto 0;
		max-width: 560px;
		text-wrap: pretty;
	}

	.chapter__edge {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			var(--accent) 30%,
			var(--accent) 70%,
			transparent
		);
		opacity: 0.5;
	}
</style>
