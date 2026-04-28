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
		phase: SliderState;
		onchange: (next: { value: number; state: 'in-progress' | 'answered' }) => void;
	}

	const { question, index, total, accent, value, phase, onchange }: Props = $props();

	const padded = $derived(String(index + 1).padStart(2, '0'));
	const statusLabel = $derived(
		phase === 'answered' ? '✓ answered' : phase === 'in-progress' ? 'in progress' : 'unanswered'
	);
</script>

<article
	class="row"
	data-state={phase}
	id="q-{question.id}"
	style:--accent="var(--vert-{accent}-mid)"
	style:--accent-ink="var(--vert-{accent}-ink)"
>
	<div class="row__card">
		<header class="row__meta">
			<span class="row__index">
				{padded}<span class="row__total"> / {total}</span>
			</span>
			<span class="row__rule" aria-hidden="true"></span>
			<span class="row__status">{statusLabel}</span>
		</header>

		<p id="statement-{question.id}" class="row__statement">
			{question.text}
		</p>

		<div class="row__slider">
			<Slider
				id="slider-{question.id}"
				labelledBy="statement-{question.id}"
				{accent}
				{value}
				{phase}
				{onchange}
			/>
		</div>
	</div>
</article>

<style>
	.row {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(24px, 4vh, 56px) clamp(16px, 4vw, 64px);
		min-height: calc(100dvh - var(--chapter-head-h, 72px));
		scroll-snap-align: start;
		scroll-snap-stop: always;
		scroll-margin-top: var(--chapter-head-h, 72px);
		background: transparent;
	}

	.row__card {
		width: min(100%, 720px);
		display: flex;
		flex-direction: column;
		gap: clamp(20px, 2.4vh, 28px);
		padding: clamp(24px, 3vw, 36px) clamp(24px, 4vw, 40px);
		background: color-mix(in oklab, var(--paper) 96%, transparent);
		backdrop-filter: blur(16px) saturate(1.05);
		-webkit-backdrop-filter: blur(16px) saturate(1.05);
		border: 1px solid var(--ink-08);
		border-radius: var(--card-radius);
		box-shadow:
			0 1px 0 color-mix(in oklab, var(--ink) 4%, transparent),
			0 12px 32px -16px color-mix(in oklab, var(--ink) 12%, transparent);
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
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
		font-size: clamp(18px, 2.2vw, 24px);
		line-height: 1.3;
		font-weight: 400;
		letter-spacing: -0.014em;
		color: var(--ink);
		margin: 0;
		text-wrap: pretty;
		text-align: center;
	}

	.row__slider {
		display: flex;
		justify-content: center;
	}
</style>
