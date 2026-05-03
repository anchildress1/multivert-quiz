<script lang="ts">
	import type { Archetype, ChapterNumeral } from '$lib/archetypes';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	interface Props {
		id: string;
		numeral: ChapterNumeral;
		title: string;
		archetype: Archetype;
		description: string;
		total: number;
		answered: number;
		/* When the hero owns the viewport, render the banner invisibly so
		   it still occupies layout space (keeping the chapter offsets
		   stable for scrollIntoView) but reads as absent. */
		ghost?: boolean;
		/* Optional reset hook. When present and the user has answered at
		   least one question, the banner shows a quiet "Reset" affordance
		   that requires a confirm-tap before invoking — the reset is
		   destructive (clears sessionStorage + every answer) so a single
		   accidental click must not nuke an in-progress session. */
		onreset?: () => void;
	}

	const {
		id,
		numeral,
		title,
		archetype,
		description,
		total,
		answered,
		ghost = false,
		onreset
	}: Props = $props();

	const safeTotal = $derived(Math.max(0, total));
	const safeAnswered = $derived(Math.max(0, Math.min(safeTotal, answered)));
	const pct = $derived(safeTotal === 0 ? 0 : Math.round((safeAnswered / safeTotal) * 100));

	const RESET_CONFIRM_MS = 3000;
	let confirmPending = $state(false);
	let confirmTimer: ReturnType<typeof setTimeout> | null = null;

	function clearConfirmTimer(): void {
		if (confirmTimer !== null) {
			clearTimeout(confirmTimer);
			confirmTimer = null;
		}
	}

	function handleResetClick(): void {
		// Defense-in-depth: the `disabled` attribute on the button already
		// prevents browser-driven clicks at zero answers, but a programmatic
		// dispatch (test harness, future a11y helper) can still fire the
		// handler. This is a destructive action — refuse anyway.
		if (safeAnswered === 0) {
			confirmPending = false;
			clearConfirmTimer();
			return;
		}
		if (confirmPending) {
			clearConfirmTimer();
			confirmPending = false;
			onreset?.();
			return;
		}
		confirmPending = true;
		clearConfirmTimer();
		confirmTimer = setTimeout(() => {
			confirmPending = false;
			confirmTimer = null;
		}, RESET_CONFIRM_MS);
	}
</script>

<header
	class="chapter-head"
	class:chapter-head--ghost={ghost}
	data-archetype={archetype}
	aria-hidden={ghost}
	inert={ghost}
	style:--accent="var(--vert-{archetype}-mid)"
	style:--accent-ink="var(--vert-{archetype}-ink)"
>
	<span class="chapter-head__numeral" aria-hidden="true">{numeral}</span>
	<div class="chapter-head__copy">
		<h2 {id} class="chapter-head__title">
			<em>{title}</em>
		</h2>
		<p class="chapter-head__description">{description}</p>
	</div>
	<div class="chapter-head__rule" aria-hidden="true"></div>
	<div
		class="chapter-head__progress"
		role="progressbar"
		aria-label="Quiz progress"
		aria-valuemin={0}
		aria-valuemax={safeTotal}
		aria-valuenow={safeAnswered}
		aria-valuetext="{safeAnswered} of {safeTotal} answered ({pct}%)"
	>
		<span class="chapter-head__progress-count" aria-hidden="true">
			<strong>{safeAnswered}</strong><span class="chapter-head__progress-total">
				/ {safeTotal}</span
			>
		</span>
		<span class="chapter-head__progress-bar" aria-hidden="true">
			<span class="chapter-head__progress-fill" style:width="{pct}%"></span>
		</span>
		<span class="chapter-head__progress-pct" aria-hidden="true">{pct}%</span>
	</div>
	{#if onreset}
		<button
			type="button"
			class="chapter-head__reset"
			class:chapter-head__reset--confirm={confirmPending}
			disabled={safeAnswered === 0}
			data-testid="chapter-reset"
			data-confirm={confirmPending}
			aria-label={confirmPending ? 'Confirm reset — clears every answer' : 'Reset all answers'}
			onclick={handleResetClick}
		>
			<em class="chapter-head__reset-label">{confirmPending ? 'Confirm?' : 'Reset'}</em>
			<span class="chapter-head__reset-glyph" aria-hidden="true">↺</span>
		</button>
	{/if}
	<div class="chapter-head__toggle">
		<ThemeToggle />
	</div>
</header>

<style>
	.chapter-head {
		position: sticky;
		top: 0;
		z-index: 5;
		display: grid;
		grid-template-columns: auto auto 1fr auto auto auto;
		align-items: center;
		gap: clamp(0.75rem, 2vw, 1.25rem);
		padding: 0.875rem clamp(1rem, 4vw, 3.5rem);
		min-height: var(--chapter-head-h, 4.5rem);
		background: var(--glass-bg);
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		border-bottom: var(--glass-border);
	}

	/* Always-on escape hatch. The result page has its own editorial
	   "Start over." gesture; this is the in-quiz equivalent so users do
	   not have to answer all 35 questions to reach a reset. Two-tap
	   confirm prevents a single accidental click from erasing a
	   half-finished session — the disabled state on zero answers keeps
	   it from reading as a mystery affordance on the cover page. */
	.chapter-head__reset {
		display: inline-flex;
		align-items: baseline;
		gap: 0.375rem;
		padding: 0;
		background: transparent;
		color: var(--ink);
		border: none;
		border-bottom: 0.0625rem solid var(--ink-30);
		border-radius: 0;
		font-family: var(--font-display);
		font-size: clamp(0.875rem, 1.4vw, 1rem);
		line-height: 1.1;
		letter-spacing: -0.015em;
		cursor: pointer;
		padding-bottom: 0.125rem;
		transition:
			border-color 0.2s ease,
			color 0.2s ease,
			gap 0.2s ease;
	}

	.chapter-head__reset-label {
		font-style: italic;
	}

	.chapter-head__reset-glyph {
		font-family: var(--font-sans);
		font-size: 0.875rem;
		font-style: normal;
		color: var(--ink-70);
		transition: transform 0.4s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.chapter-head__reset:hover:not(:disabled) {
		border-bottom-color: var(--accent, var(--ink));
		gap: 0.5rem;
	}

	.chapter-head__reset:hover:not(:disabled) .chapter-head__reset-glyph {
		transform: rotate(-180deg);
		color: var(--accent, var(--ink));
	}

	.chapter-head__reset:focus-visible {
		outline: 0.125rem solid var(--ink);
		outline-offset: 0.25rem;
	}

	.chapter-head__reset:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.chapter-head__reset--confirm {
		border-bottom-color: var(--accent, var(--ink));
		color: var(--accent-ink, var(--ink));
	}

	.chapter-head__reset--confirm .chapter-head__reset-glyph {
		color: var(--accent, var(--ink));
	}

	.chapter-head--ghost {
		visibility: hidden;
	}

	.chapter-head__numeral {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(1.75rem, 3vw, 2.25rem);
		line-height: 1;
		color: var(--accent-ink);
		min-width: 2rem;
		text-align: center;
	}

	.chapter-head__rule {
		height: 0.0625rem;
		background: linear-gradient(to right, var(--accent), transparent 80%);
	}

	.chapter-head__copy {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.chapter-head__title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(1.25rem, 2.4vw, 1.75rem);
		line-height: 1;
		letter-spacing: -0.02em;
		margin: 0;
		color: var(--ink);
		white-space: nowrap;
	}

	.chapter-head__title em {
		font-style: italic;
	}

	.chapter-head__description {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(0.8125rem, 1.3vw, 0.9375rem);
		line-height: 1.35;
		color: var(--ink-70);
		margin: 0;
		text-wrap: balance;
		max-width: 64ch;
	}

	/* Progress block — small mono cluster on the right. Quiet enough to read
	   as a status strip on the chapter banner rather than a second bar. */
	.chapter-head__progress {
		display: grid;
		grid-template-columns: auto minmax(3.75rem, 12.5rem) auto;
		align-items: center;
		gap: 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--ink-70);
	}

	.chapter-head__progress-count strong {
		color: var(--ink);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.chapter-head__progress-total {
		color: var(--ink-70);
	}

	.chapter-head__progress-bar {
		display: block;
		height: 0.1875rem;
		border-radius: 99rem;
		background: var(--ink-08);
		overflow: hidden;
		position: relative;
	}

	.chapter-head__progress-fill {
		display: block;
		height: 100%;
		background: var(--ink);
		transition: width 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.chapter-head__progress-pct {
		font-variant-numeric: tabular-nums;
		color: var(--ink-70);
		min-width: 2.25rem;
		text-align: right;
	}

	.chapter-head__toggle {
		display: flex;
		align-items: center;
	}

	/* Medium screens: drop the long bar segment so the count + pct still
	   read at a glance, and let the title breathe. */
	@media (max-width: 60rem) {
		.chapter-head__progress {
			grid-template-columns: auto auto;
			gap: 0.5rem;
		}
		.chapter-head__progress-bar {
			display: none;
		}
	}

	/* Narrow screens: drop the description and the gradient rule. Keeps the
	   numeral + title + a hairline progress count + reset + theme toggle.
	   Reset collapses to glyph-only — `aria-label` on the button keeps the
	   accessible name intact for screen readers. */
	@media (max-width: 47.5rem) {
		.chapter-head__description {
			display: none;
		}
		.chapter-head__rule {
			display: none;
		}
		.chapter-head {
			grid-template-columns: auto 1fr auto auto auto;
			gap: 0.875rem;
		}
		.chapter-head__progress-count {
			display: none;
		}
		.chapter-head__reset-label {
			display: none;
		}
		.chapter-head__reset {
			border-bottom: none;
			padding: 0.25rem;
			gap: 0;
		}
	}
</style>
