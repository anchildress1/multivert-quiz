<script lang="ts">
	import Slider, { type SliderState } from '$lib/components/Slider.svelte';
	import type { Question } from '$lib/questions';
	import type { Archetype } from '$lib/scoring';

	interface Props {
		question: Question;
		index: number;
		total: number;
		accent: Archetype;
		value: number | null;
		state: SliderState;
		onchange: (next: { value: number; state: SliderState }) => void;
	}

	const { question, index, total, accent, value, state, onchange }: Props = $props();

	const padded = $derived(String(index + 1).padStart(2, '0'));
	const statusLabel = $derived(
		state === 'answered' ? '✓ answered' : state === 'in-progress' ? 'in progress' : 'unanswered'
	);
</script>

<article
	class="row"
	data-state={state}
	id="q-{question.id}"
	style:--accent="var(--vert-{accent}-mid)"
	style:--accent-ink="var(--vert-{accent}-ink)"
>
	<header class="row__meta">
		<span class="row__index">
			{padded}<span class="row__total"> / {total}</span>
		</span>
		<span class="row__rule" aria-hidden="true"></span>
		<span class="row__status">{statusLabel}</span>
	</header>

	<p class="row__statement">
		{question.text}
	</p>

	<div class="row__slider">
		<Slider id="slider-{question.id}" label={question.text} {accent} {value} {state} {onchange} />
	</div>
</article>

<style>
	.row {
		position: relative;
		z-index: 1;
		max-width: 760px;
		margin: 0 auto;
		padding: 64px 24px;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 32px;
		scroll-margin-top: 96px;
		min-height: 100dvh;
		justify-content: center;
		background: transparent;
	}

	.row::before {
		content: '';
		position: absolute;
		inset: 16px clamp(8px, 4vw, 64px);
		background: color-mix(in oklab, var(--paper) 96%, transparent);
		backdrop-filter: blur(20px) saturate(1.05);
		-webkit-backdrop-filter: blur(20px) saturate(1.05);
		border: 1px solid var(--ink-08);
		border-radius: var(--card-radius);
		box-shadow:
			0 1px 0 color-mix(in oklab, var(--ink) 4%, transparent),
			0 24px 48px -16px color-mix(in oklab, var(--ink) 12%, transparent);
		z-index: -1;
	}

	.row__meta {
		display: flex;
		align-items: baseline;
		gap: 14px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.05em;
		color: var(--ink-50);
	}

	.row__index {
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		color: var(--ink-70);
	}

	.row[data-state='answered'] .row__index,
	.row[data-state='answered'] .row__status {
		color: var(--accent-ink);
	}

	.row__total {
		color: var(--ink-30);
	}

	.row__rule {
		flex: 1;
		height: 1px;
		background: var(--ink-08);
	}

	.row__status {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
	}

	.row__statement {
		font-family: var(--font-display);
		font-size: clamp(24px, 3.4vw, 36px);
		line-height: 1.22;
		font-weight: 400;
		letter-spacing: -0.018em;
		color: var(--ink);
		margin: 0;
		text-wrap: pretty;
		text-align: center;
	}

	.row__slider {
		display: flex;
		justify-content: center;
	}

	@media (min-width: 768px) {
		.row {
			padding: 80px 24px;
			gap: 40px;
		}
	}
</style>
