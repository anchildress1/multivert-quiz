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
		/**
		 * Monotonically increasing timestamp the route bumps each time the user
		 * tries to scroll forward past the document floor (i.e., past this
		 * gating row). The row plays a brief rubber-band animation in response.
		 * 0 means "no nudge" and disables the effect — passed only to the row
		 * whose phase is `unset`, so revising answered rows never pulses.
		 */
		nudgeAt?: number;
	}

	const { question, index, total, accent, value, phase, onchange, nudgeAt = 0 }: Props = $props();

	const padded = $derived(String(index + 1).padStart(2, '0'));
	const statusLabel = $derived(
		phase === 'answered' ? '✓ answered' : phase === 'in-progress' ? 'in progress' : 'unanswered'
	);

	let pulseActive = $state(false);

	$effect(() => {
		void nudgeAt; // sole dependency — re-runs every time the parent bumps it
		if (nudgeAt === 0) return;

		// Force the CSS animation to restart on every nudge by flipping the
		// class off, then back on next frame. Without the off-frame, repeated
		// nudges would re-apply an already-applied class and the keyframes
		// would not replay. Reading `pulseActive` here would make it a
		// reactivity dependency and cause the effect to re-run from its own
		// write — so we deliberately only WRITE it, never read it.
		pulseActive = false;
		const raf = requestAnimationFrame(() => {
			pulseActive = true;
		});
		const end = setTimeout(() => {
			pulseActive = false;
		}, 620);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(end);
		};
	});
</script>

<article
	class="row"
	class:row--nudged={pulseActive}
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
		align-items: flex-start;
		justify-content: center;
		padding: clamp(40px, 8vh, 96px) clamp(16px, 4vw, 64px) clamp(32px, 6vh, 72px);
		/* Tall enough for scroll-snap to feel deliberate; short enough that the
		   card hugs the chapter head instead of floating in a void. */
		min-height: calc(80dvh - var(--chapter-head-h, 72px));
		scroll-snap-align: start;
		scroll-snap-stop: always;
		/* No scroll-margin-top here — the html-level `scroll-padding-top`
		   already reserves space for the sticky chapter banner. Adding
		   scroll-margin on the row would double-count, push the snap
		   target so far down that scroll can never reach the pin point
		   for the banner, and leave a strip of hero visible on first
		   scroll. */
		background: transparent;
	}

	.row__card {
		width: min(100%, 45rem);
		display: flex;
		flex-direction: column;
		gap: clamp(1.25rem, 2.4vh, 1.75rem);
		padding: clamp(1.5rem, 3vw, 2.25rem) clamp(1.5rem, 4vw, 2.5rem);
		background: var(--glass-bg);
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		border: var(--glass-border);
		border-radius: var(--card-radius);
		/* Inset accent stripe lives on the card's left edge — gives every
		   question quiet chapter-of-origin context without competing with the
		   active-state halo on the border. The rotating accent token already
		   lives on `--accent` so this requires no per-row plumbing. */
		box-shadow:
			inset 3px 0 0 color-mix(in oklab, var(--accent) 80%, transparent),
			0 1px 2px color-mix(in oklab, var(--ink) 4%, transparent),
			0 16px 40px -12px color-mix(in oklab, var(--ink) 12%, transparent);
		transition:
			transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
			border-color 0.4s ease,
			box-shadow 0.4s ease;
	}

	.row__card:hover {
		transform: translateY(-2px);
		box-shadow:
			inset 3px 0 0 color-mix(in oklab, var(--accent) 90%, transparent),
			0 4px 12px color-mix(in oklab, var(--ink) 6%, transparent),
			0 24px 48px -12px color-mix(in oklab, var(--ink) 16%, transparent);
	}

	/* Forward-progress feedback. The card mimics a damped rubber-band: the
	   user pushed against the document floor, so the card briefly leans
	   into the push and settles. Layered with an accent halo on the card
	   border so the eye lands on the question that is actually gating. */
	.row--nudged .row__card {
		animation:
			row-rubber-band 620ms cubic-bezier(0.32, 0.72, 0, 1) both,
			row-halo 620ms ease-out both;
	}

	@keyframes row-rubber-band {
		0% {
			transform: translateY(0);
		}
		22% {
			transform: translateY(10px);
		}
		44% {
			transform: translateY(-2px);
		}
		64% {
			transform: translateY(4px);
		}
		82% {
			transform: translateY(-1px);
		}
		100% {
			transform: translateY(0);
		}
	}

	@keyframes row-halo {
		0% {
			border-color: var(--ink-08);
			box-shadow:
				inset 3px 0 0 color-mix(in oklab, var(--accent) 60%, transparent),
				0 1px 0 color-mix(in oklab, var(--ink) 4%, transparent),
				0 12px 32px -16px color-mix(in oklab, var(--ink) 12%, transparent),
				0 0 0 0 color-mix(in oklab, var(--accent) 40%, transparent);
		}
		36% {
			border-color: var(--accent);
			box-shadow:
				inset 3px 0 0 var(--accent),
				0 1px 0 color-mix(in oklab, var(--ink) 4%, transparent),
				0 12px 32px -16px color-mix(in oklab, var(--ink) 12%, transparent),
				0 0 0 8px color-mix(in oklab, var(--accent) 18%, transparent);
		}
		100% {
			border-color: var(--ink-08);
			box-shadow:
				inset 3px 0 0 color-mix(in oklab, var(--accent) 60%, transparent),
				0 1px 0 color-mix(in oklab, var(--ink) 4%, transparent),
				0 12px 32px -16px color-mix(in oklab, var(--ink) 12%, transparent),
				0 0 0 0 transparent;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.row--nudged .row__card {
			/* Drop the bounce; keep the halo so the cue is still legible. */
			animation: row-halo-soft 480ms ease-out both;
			transform: none;
		}
		@keyframes row-halo-soft {
			0%,
			100% {
				border-color: var(--ink-08);
			}
			50% {
				border-color: var(--accent);
			}
		}
	}

	.row__meta {
		display: flex;
		align-items: baseline;
		gap: 14px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.05em;
		color: var(--ink-70);
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
		color: var(--ink-70);
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
