<script lang="ts">
	import { browser } from '$app/environment';
	import { VERT_NAMES, VERT_ORDER, type Archetype } from '$lib/archetypes';
	import { descriptions } from '$lib/descriptions';

	interface Props {
		/** Whether the sheet is currently rendered. The host owns the boolean. */
		open: boolean;
		/** Which archetype the sheet is showing — null while closed. */
		archetype: Archetype | null;
		/** Called when the user dismisses (scrim, ESC, or close button). */
		onclose: () => void;
	}

	const { open, archetype, onclose }: Props = $props();

	let dialogEl = $state<HTMLElement | null>(null);
	let returnFocusEl: HTMLElement | null = null;

	/* Body-scroll lock + focus management. The host page is a long single-scroll
	   document; without `overflow: hidden` on the body, scrolling the sheet would
	   bleed through to the underlying page. Captures the previously-focused
	   element on open and restores it on close so keyboard users land back on
	   the bar they triggered the sheet from. */
	$effect(() => {
		if (!open || !browser) return;

		returnFocusEl = document.activeElement as HTMLElement | null;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		queueMicrotask(() => {
			dialogEl?.focus();
		});

		return () => {
			document.body.style.overflow = previousOverflow;
			returnFocusEl?.focus();
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (!open) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
			return;
		}
		if (event.key !== 'Tab' || !dialogEl) return;
		const focusable = Array.from(
			dialogEl.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((el) => !el.hasAttribute('inert'));
		if (focusable.length === 0) return;
		const first = focusable[0]!;
		const last = focusable[focusable.length - 1]!;
		const active = document.activeElement;
		if (event.shiftKey && (active === first || active === dialogEl)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && archetype}
	{@const meta = VERT_NAMES[archetype]}
	{@const desc = descriptions[archetype]}
	{@const archetypeIndex = VERT_ORDER.indexOf(archetype)}
	<div
		class="sheet"
		role="dialog"
		aria-modal="true"
		aria-labelledby="vert-sheet-title"
		data-archetype={archetype}
		style:--sheet-soft="var(--vert-{archetype}-soft)"
		style:--sheet-mid="var(--vert-{archetype}-mid)"
		style:--sheet-ink="var(--vert-{archetype}-ink)"
	>
		<div
			class="sheet__scrim"
			role="presentation"
			aria-hidden="true"
			onclick={onclose}
			ontouchend={onclose}
		></div>

		<article class="sheet__card" tabindex="-1" bind:this={dialogEl} data-testid="vert-sheet-paper">
			<!-- Close button on its own paper row — kept off the title strip
			     so the strip stays a single uninterrupted horizontal band. -->
			<div class="sheet__head">
				<button
					type="button"
					class="sheet__close"
					onclick={onclose}
					aria-label="Close — return to results"
				>
					<em>close.</em>
					<span class="sheet__close-glyph" aria-hidden="true">×</span>
				</button>
			</div>

			<!-- Title strip — a single horizontal colour band, one line, just
			     the archetype name. The strip IS the title header. -->
			<header class="sheet__strip">
				<h2 id="vert-sheet-title" class="sheet__name">{meta.name.toUpperCase()}</h2>
			</header>

			<div class="sheet__content">
				<!-- Tagline sits on paper, right-aligned, directly under the strip
				     so it reads as a quiet caption on the title above. -->
				<p class="sheet__tagline">
					№ {String(archetypeIndex + 1).padStart(2, '0')}/05 &nbsp;·&nbsp;
					<em>{meta.label}.</em>
				</p>

				<div class="sheet__lede">
					<p class="sheet__headline">{desc.headline}</p>
					<p class="sheet__body">{desc.body}</p>
				</div>

				<section class="sheet__section sheet__section--day" aria-labelledby="vert-sheet-day">
					<p id="vert-sheet-day" class="sheet__section-label">
						<span class="sheet__section-num">i.</span>
						<span class="sheet__section-text">A day in the life</span>
						<span class="sheet__section-rule" aria-hidden="true"></span>
					</p>
					<p class="sheet__day-text">{desc.deep.dayInTheLife}</p>
				</section>

				<section class="sheet__section" aria-labelledby="vert-sheet-truths">
					<p id="vert-sheet-truths" class="sheet__section-label">
						<span class="sheet__section-num">ii.</span>
						<span class="sheet__section-text"
							>Five things that are true and you've never told anyone</span
						>
						<span class="sheet__section-rule" aria-hidden="true"></span>
					</p>
					<ol class="sheet__truth-list">
						{#each desc.deep.trueThings as line, i (line)}
							<li class="sheet__truth">
								<span class="sheet__truth-num" aria-hidden="true">
									{String(i + 1).padStart(2, '0')}
								</span>
								<span class="sheet__truth-text">{line}</span>
							</li>
						{/each}
					</ol>
				</section>

				<section class="sheet__section" aria-labelledby="vert-sheet-giveaways">
					<p id="vert-sheet-giveaways" class="sheet__section-label">
						<span class="sheet__section-num">iii.</span>
						<span class="sheet__section-text">The giveaways</span>
						<span class="sheet__section-rule" aria-hidden="true"></span>
					</p>
					<ul class="sheet__giveaway-list">
						{#each desc.deep.giveaways as tell (tell)}
							<li class="sheet__giveaway">{tell}</li>
						{/each}
					</ul>
				</section>

				<dl class="sheet__defs">
					<div class="sheet__def">
						<dt>What helps</dt>
						<dd>{desc.deep.whatHelps}</dd>
					</div>
					<div class="sheet__def">
						<dt>What kills you</dt>
						<dd>{desc.deep.whatKillsYou}</dd>
					</div>
				</dl>

				<aside class="sheet__pull" aria-label="closing line">
					<p class="sheet__pull-label">
						<span>You'll never admit it, but —</span>
						<span class="sheet__section-rule" aria-hidden="true"></span>
					</p>
					<p class="sheet__pull-text">{desc.deep.youllNeverAdmit}</p>
				</aside>
			</div>
		</article>
	</div>
{/if}

<style>
	/* The sheet is a per-archetype Pantone-style swatch card overlaid on
	   the page. Same glass-card surface as the result hero — colour mixed
	   into paper for a softer field, plus radial highlights for the glass
	   sheen. Type prints in the deep tone-on-tone ink. The whole card
	   reads as the SAME visual material as the swatch hero you tapped
	   from, just expanded into a deeper view. */
	.sheet {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: stretch;
		animation: sheet-in 220ms cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.sheet__scrim {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(
				ellipse 80% 70% at 30% 0%,
				color-mix(in oklab, var(--sheet-soft) 48%, transparent) 0%,
				transparent 70%
			),
			color-mix(in oklab, var(--ink) 56%, transparent);
		backdrop-filter: blur(0.375rem) saturate(0.96);
		-webkit-backdrop-filter: blur(0.375rem) saturate(0.96);
		cursor: pointer;
	}

	.sheet__card {
		position: relative;
		justify-self: center;
		align-self: stretch;
		width: 100%;
		max-width: 55rem;
		max-height: 100vh;
		overflow-y: auto;
		background: var(--paper);
		color: var(--ink);
		box-shadow: 0 2.5rem 7.5rem -2.5rem color-mix(in oklab, var(--ink) 70%, transparent);
		animation: card-in 320ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
		outline: none;
	}

	/* Close-button strip — a thin paper row above the title strip. Keeps
	   the close gesture off the title's line so the colour strip stays
	   visually a single uninterrupted band. */
	.sheet__head {
		display: flex;
		justify-content: flex-end;
		padding: clamp(0.5rem, 1.5vh, 1rem) clamp(1rem, 4vw, 3rem);
	}

	/* Title strip — single horizontal colour band, one line, the archetype
	   name only. Glass-card finish (colour mixed into paper, top-left light
	   catch) visually quotes the result hero. The strip IS the title
	   header. */
	.sheet__strip {
		padding: clamp(1rem, 2.6vh, 1.5rem) clamp(1.25rem, 5vw, 4.5rem);
		background:
			radial-gradient(
				ellipse 70% 55% at 18% 0%,
				color-mix(in oklab, white 30%, transparent) 0%,
				transparent 70%
			),
			color-mix(in oklab, var(--sheet-mid) 70%, var(--paper));
		color: var(--sheet-ink);
	}

	/* Body section — paper, generous side and bottom padding to read like
	   a printed brief once the strip identifies the type at the top. */
	.sheet__content {
		padding: clamp(1.25rem, 3vh, 2rem) clamp(1.25rem, 5vw, 4.5rem) clamp(3rem, 8vh, 6rem);
	}

	@media (min-width: 47.5rem) {
		.sheet {
			padding: clamp(1.25rem, 4vh, 3.5rem);
			place-items: center;
		}
		.sheet__card {
			max-height: min(92vh, 60rem);
			border-radius: var(--card-radius);
		}
	}

	/* Close button — a small mono ALL-CAPS gesture so it sits in the same
	   chrome register as the № reference, instead of fighting it with a
	   different typeface. */
	.sheet__close {
		display: inline-flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.25rem 0.125rem;
		background: transparent;
		border: none;
		border-bottom: 0.0625rem solid transparent;
		color: var(--sheet-ink);
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		line-height: 1;
		cursor: pointer;
		transition:
			border-color 0.18s ease,
			gap 0.2s ease,
			opacity 0.18s ease;
		opacity: 0.85;
	}

	.sheet__close em {
		font-family: var(--font-display);
		font-style: italic;
		text-transform: none;
		letter-spacing: 0;
		font-size: 0.875rem;
	}

	.sheet__close-glyph {
		font-family: var(--font-sans);
		font-size: 1rem;
		text-transform: none;
		letter-spacing: 0;
		transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.sheet__close:hover,
	.sheet__close:focus-visible {
		opacity: 1;
		border-bottom-color: var(--sheet-ink);
		gap: 0.75rem;
	}

	.sheet__close:hover .sheet__close-glyph,
	.sheet__close:focus-visible .sheet__close-glyph {
		transform: rotate(90deg);
	}

	.sheet__close:focus-visible {
		outline: none;
	}

	/* Archetype name — the only content of the strip. Heavy sans, all-caps,
	   deep tone-on-tone ink. Sized smaller than the result hero because
	   this is the "deeper view." */
	.sheet__name {
		font-family: var(--font-sans);
		font-weight: 600;
		font-size: clamp(2.5rem, 7vw, 5rem);
		line-height: 0.95;
		letter-spacing: -0.04em;
		color: var(--sheet-ink);
		margin: 0;
		text-transform: uppercase;
		text-wrap: balance;
	}

	/* Tagline lives on paper directly under the strip, right-aligned so it
	   reads as a quiet caption on the colour-name above. Includes the
	   small mono № reference inline (the chrome was its own row before;
	   merged here so the strip itself stays clean). */
	.sheet__tagline {
		font-family: var(--font-mono);
		font-size: clamp(0.6875rem, 1vw, 0.75rem);
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--sheet-ink);
		opacity: 0.85;
		margin: 0 0 clamp(2rem, 5vh, 3rem);
		text-align: right;
	}

	.sheet__tagline em {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.4em;
		letter-spacing: 0;
		text-transform: none;
		color: var(--sheet-ink);
	}

	.sheet__lede {
		margin-bottom: clamp(2.5rem, 7vh, 4.5rem);
		max-width: 60ch;
	}

	.sheet__headline {
		font-family: var(--font-sans);
		font-weight: 500;
		font-size: clamp(1.375rem, 2.6vw, 1.875rem);
		line-height: 1.2;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 0 0 1.5rem;
		max-width: 28ch;
		text-wrap: balance;
	}

	.sheet__body {
		font-family: var(--font-sans);
		font-size: clamp(0.9375rem, 1.4vw, 1.0625rem);
		line-height: 1.6;
		color: var(--ink-70);
		margin: 0;
		text-wrap: pretty;
		white-space: pre-wrap;
	}

	/* ── Section blocks ───────────────────────────────────────────────────
	   Each section gets a mono Pantone-card label (same shape as the
	   chrome above) plus its body content. No more italic-display H3s —
	   the surface is a colour card now, sans is the natural register. */
	.sheet__section {
		margin-bottom: clamp(2.5rem, 7vh, 4.5rem);
	}

	.sheet__section-label {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		margin: 0 0 1.25rem;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--sheet-ink);
	}

	.sheet__section-num {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: var(--sheet-ink);
		opacity: 0.7;
	}

	.sheet__section-text {
		text-wrap: balance;
	}

	/* Fading hairline rule on the right of every section header — same
	   gradient gesture the chapter banners use to break up walls of text.
	   Tinted with the archetype's deep ink so it carries colour identity
	   without shouting. */
	.sheet__section-rule {
		flex: 1;
		min-width: 1.5rem;
		height: 0.0625rem;
		background: linear-gradient(
			to right,
			color-mix(in oklab, var(--sheet-ink) 32%, transparent),
			transparent 85%
		);
	}

	/* Day-in-the-life — the centrepiece. Sans body, drop-cap on the first
	   letter (Y, T, etc.) sized via `initial-letter` so it snaps to three
	   lines cleanly. The drop-cap stays archetype-tinted to tie back to
	   the banner. */
	.sheet__day-text {
		max-width: 60ch;
		font-family: var(--font-sans);
		font-size: clamp(1rem, 1.5vw, 1.125rem);
		line-height: 1.6;
		color: var(--ink);
		margin: 0;
		text-wrap: pretty;
	}

	.sheet__day-text::first-letter {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		color: var(--sheet-ink);
		-webkit-initial-letter: 3;
		initial-letter: 3;
		margin-right: 0.08em;
	}

	/* Five things — numbered list with mono numerals in a left gutter,
	   each item separated by a hairline rule in the deep ink at low
	   opacity (so it reads on the glass card without looking like a
	   form). */
	.sheet__truth-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sheet__truth {
		display: grid;
		grid-template-columns: 2.25rem 1fr;
		align-items: baseline;
		gap: 1.125rem;
		padding-top: 1rem;
		border-top: 0.0625rem solid var(--ink-08);
	}

	.sheet__truth:first-child {
		padding-top: 0;
		border-top: none;
	}

	.sheet__truth-num {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.1em;
		color: var(--sheet-ink);
		font-variant-numeric: tabular-nums;
		opacity: 0.7;
	}

	.sheet__truth-text {
		font-family: var(--font-sans);
		font-size: clamp(0.9375rem, 1.4vw, 1.0625rem);
		line-height: 1.55;
		color: var(--ink);
		text-wrap: pretty;
	}

	/* Giveaways — italic display, em-dash bullet. The voice register
	   shifts here on purpose: signals are scenic, not data. */
	.sheet__giveaway-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.sheet__giveaway {
		position: relative;
		padding: 0.25rem 0 0.25rem 1.5rem;
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(1.0625rem, 1.7vw, 1.25rem);
		line-height: 1.4;
		color: var(--ink);
		text-wrap: pretty;
	}

	.sheet__giveaway::before {
		content: '—';
		position: absolute;
		left: 0;
		top: 0;
		font-style: normal;
		color: var(--sheet-ink);
		opacity: 0.7;
	}

	/* What helps / What kills you — definition pair, two columns on wide
	   screens, stacked on narrow. Mono labels match the section chrome. */
	.sheet__defs {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0;
		margin: 0 0 clamp(2.5rem, 6vh, 4rem);
		padding: 1.75rem 0;
		border-top: 0.0625rem solid var(--ink-08);
		border-bottom: 0.0625rem solid var(--ink-08);
	}

	.sheet__def {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.375rem;
		padding: 1.125rem 0;
	}

	.sheet__def + .sheet__def {
		border-top: 0.0625rem dashed var(--ink-12);
	}

	.sheet__def dt {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--sheet-ink);
		margin: 0;
	}

	.sheet__def dd {
		margin: 0;
		font-family: var(--font-sans);
		font-size: clamp(0.9375rem, 1.4vw, 1.0625rem);
		line-height: 1.6;
		color: var(--ink);
		max-width: 60ch;
		text-wrap: pretty;
	}

	@media (min-width: 45rem) {
		.sheet__def {
			grid-template-columns: 12.5rem 1fr;
			gap: 2rem;
			align-items: baseline;
		}
	}

	/* Closing pull-quote — italic display, the closing voice gesture. */
	.sheet__pull {
		margin: 0;
		padding: 0;
	}

	.sheet__pull-label {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		margin: 0 0 0.875rem;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--sheet-ink);
	}

	.sheet__pull-text {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(1.375rem, 2.8vw, 2rem);
		line-height: 1.2;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 0;
		text-wrap: balance;
		max-width: 28ch;
	}

	@keyframes sheet-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(1.75rem);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet,
		.sheet__card {
			animation: none;
		}
		.sheet__close-glyph {
			transition: none;
		}
	}
</style>
