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
			<header class="sheet__chrome">
				<span class="sheet__ref">
					№ {String(archetypeIndex + 1).padStart(2, '0')}/05 &nbsp;·&nbsp; on being an {meta.name.toLowerCase()}
				</span>
				<button
					type="button"
					class="sheet__close"
					onclick={onclose}
					aria-label="Close — return to results"
				>
					<em>close.</em>
					<span class="sheet__close-glyph" aria-hidden="true">×</span>
				</button>
			</header>

			<h2 id="vert-sheet-title" class="sheet__name">{meta.name.toUpperCase()}</h2>
			<p class="sheet__tagline">{meta.label}.</p>

			<div class="sheet__lede">
				<p class="sheet__headline">{desc.headline}</p>
				<p class="sheet__body">{desc.body}</p>
			</div>

			<section class="sheet__section sheet__section--day" aria-labelledby="vert-sheet-day">
				<p id="vert-sheet-day" class="sheet__section-label">
					<span class="sheet__section-num">i.</span>
					A day in the life
				</p>
				<p class="sheet__day-text">{desc.deep.dayInTheLife}</p>
			</section>

			<section class="sheet__section" aria-labelledby="vert-sheet-truths">
				<p id="vert-sheet-truths" class="sheet__section-label">
					<span class="sheet__section-num">ii.</span>
					Five things that are true and you've never told anyone
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
					The giveaways
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
				<span class="sheet__pull-label">You'll never admit it, but —</span>
				<p class="sheet__pull-text">{desc.deep.youllNeverAdmit}</p>
			</aside>
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
		backdrop-filter: blur(6px) saturate(0.96);
		-webkit-backdrop-filter: blur(6px) saturate(0.96);
		cursor: pointer;
	}

	.sheet__card {
		position: relative;
		justify-self: center;
		align-self: stretch;
		width: 100%;
		max-width: 880px;
		max-height: 100vh;
		overflow-y: auto;
		padding: clamp(28px, 4vh, 56px) clamp(20px, 5vw, 72px) clamp(48px, 8vh, 96px);
		background:
			radial-gradient(
				ellipse 70% 55% at 18% 8%,
				color-mix(in oklab, white 30%, transparent) 0%,
				transparent 65%
			),
			color-mix(in oklab, var(--sheet-mid) 72%, var(--paper));
		color: var(--sheet-ink);
		box-shadow: 0 40px 120px -40px color-mix(in oklab, var(--ink) 70%, transparent);
		animation: card-in 320ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
		outline: none;
	}

	/* Bottom-right glass sheen — same gesture as the result hero. */
	.sheet__card::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			ellipse 50% 40% at 88% 92%,
			color-mix(in oklab, var(--sheet-ink) 14%, transparent) 0%,
			transparent 60%
		);
	}

	/* Lift the content above the bottom-right sheen. */
	.sheet__card > * {
		position: relative;
		z-index: 1;
	}

	@media (min-width: 760px) {
		.sheet {
			padding: clamp(20px, 4vh, 56px);
			place-items: center;
		}
		.sheet__card {
			max-height: min(92vh, 960px);
			border-radius: var(--card-radius);
		}
	}

	/* Pantone chrome — same shape as the swatch hero's chrome row, so
	   opening the sheet feels like turning the colour-card over to read
	   the back. */
	.sheet__chrome {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px 24px;
		flex-wrap: wrap;
		margin-bottom: clamp(24px, 4vh, 48px);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--sheet-ink);
		opacity: 0.85;
	}

	.sheet__ref {
		font-variant-numeric: tabular-nums;
	}

	/* Close button — a small mono ALL-CAPS gesture so it sits in the same
	   chrome register as the № reference, instead of fighting it with a
	   different typeface. */
	.sheet__close {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		padding: 4px 2px;
		background: transparent;
		border: none;
		border-bottom: 1px solid transparent;
		color: var(--sheet-ink);
		font-family: var(--font-mono);
		font-size: 11px;
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
		font-size: 14px;
	}

	.sheet__close-glyph {
		font-family: var(--font-sans);
		font-size: 16px;
		text-transform: none;
		letter-spacing: 0;
		transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.sheet__close:hover,
	.sheet__close:focus-visible {
		opacity: 1;
		border-bottom-color: var(--sheet-ink);
		gap: 12px;
	}

	.sheet__close:hover .sheet__close-glyph,
	.sheet__close:focus-visible .sheet__close-glyph {
		transform: rotate(90deg);
	}

	.sheet__close:focus-visible {
		outline: none;
	}

	/* Archetype name as the colour-card label — heavy sans, all-caps,
	   sized smaller than the result hero (this is the back of the card,
	   not the front). */
	.sheet__name {
		font-family: var(--font-sans);
		font-weight: 600;
		font-size: clamp(48px, 8vw, 96px);
		line-height: 0.9;
		letter-spacing: -0.04em;
		color: var(--sheet-ink);
		margin: 0;
		text-transform: uppercase;
		text-wrap: balance;
	}

	/* Tagline right-aligned to the card edge — mirrors the swatch hero's
	   right-aligned label. */
	.sheet__tagline {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(16px, 1.8vw, 22px);
		line-height: 1.2;
		color: var(--sheet-ink);
		opacity: 0.78;
		margin: clamp(8px, 1.2vh, 14px) 0 clamp(32px, 5vh, 56px);
		text-align: right;
	}

	.sheet__lede {
		margin-bottom: clamp(40px, 7vh, 72px);
		max-width: 60ch;
	}

	.sheet__headline {
		font-family: var(--font-sans);
		font-weight: 500;
		font-size: clamp(22px, 2.6vw, 30px);
		line-height: 1.2;
		letter-spacing: -0.015em;
		color: var(--sheet-ink);
		margin: 0 0 24px;
		max-width: 28ch;
		text-wrap: balance;
	}

	.sheet__body {
		font-family: var(--font-sans);
		font-size: clamp(15px, 1.4vw, 17px);
		line-height: 1.6;
		color: var(--sheet-ink);
		margin: 0;
		text-wrap: pretty;
		white-space: pre-wrap;
		opacity: 0.92;
	}

	/* ── Section blocks ───────────────────────────────────────────────────
	   Each section gets a mono Pantone-card label (same shape as the
	   chrome above) plus its body content. No more italic-display H3s —
	   the surface is a colour card now, sans is the natural register. */
	.sheet__section {
		margin-bottom: clamp(40px, 7vh, 72px);
	}

	.sheet__section-label {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin: 0 0 20px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--sheet-ink);
		opacity: 0.85;
		text-wrap: balance;
	}

	.sheet__section-num {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		opacity: 0.7;
	}

	/* Day-in-the-life — the centrepiece. Sans body, drop-cap on the first
	   letter (Y, T, etc.) sized via `initial-letter` so it snaps to three
	   lines cleanly. */
	.sheet__day-text {
		max-width: 60ch;
		font-family: var(--font-sans);
		font-size: clamp(16px, 1.5vw, 18px);
		line-height: 1.6;
		color: var(--sheet-ink);
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
		gap: 16px;
	}

	.sheet__truth {
		display: grid;
		grid-template-columns: 36px 1fr;
		align-items: baseline;
		gap: 18px;
		padding-top: 16px;
		border-top: 1px solid color-mix(in oklab, var(--sheet-ink) 14%, transparent);
	}

	.sheet__truth:first-child {
		padding-top: 0;
		border-top: none;
	}

	.sheet__truth-num {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--sheet-ink);
		font-variant-numeric: tabular-nums;
		opacity: 0.7;
	}

	.sheet__truth-text {
		font-family: var(--font-sans);
		font-size: clamp(15px, 1.4vw, 17px);
		line-height: 1.55;
		color: var(--sheet-ink);
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
		gap: 12px;
	}

	.sheet__giveaway {
		position: relative;
		padding: 4px 0 4px 24px;
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(17px, 1.7vw, 20px);
		line-height: 1.4;
		color: var(--sheet-ink);
		text-wrap: pretty;
	}

	.sheet__giveaway::before {
		content: '—';
		position: absolute;
		left: 0;
		top: 0;
		font-style: normal;
		opacity: 0.6;
	}

	/* What helps / What kills you — definition pair set in two columns on
	   wide screens, stacked on narrow. Mono labels match the section
	   chrome. */
	.sheet__defs {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0;
		margin: 0 0 clamp(40px, 6vh, 64px);
		padding: 28px 0;
		border-top: 1px solid color-mix(in oklab, var(--sheet-ink) 14%, transparent);
		border-bottom: 1px solid color-mix(in oklab, var(--sheet-ink) 14%, transparent);
	}

	.sheet__def {
		display: grid;
		grid-template-columns: 1fr;
		gap: 6px;
		padding: 18px 0;
	}

	.sheet__def + .sheet__def {
		border-top: 1px dashed color-mix(in oklab, var(--sheet-ink) 16%, transparent);
	}

	.sheet__def dt {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--sheet-ink);
		opacity: 0.85;
		margin: 0;
	}

	.sheet__def dd {
		margin: 0;
		font-family: var(--font-sans);
		font-size: clamp(15px, 1.4vw, 17px);
		line-height: 1.6;
		color: var(--sheet-ink);
		max-width: 60ch;
		text-wrap: pretty;
	}

	@media (min-width: 720px) {
		.sheet__def {
			grid-template-columns: 200px 1fr;
			gap: 32px;
			align-items: baseline;
		}
	}

	/* Closing pull-quote — italic display, the closing voice gesture. */
	.sheet__pull {
		margin: 0;
		padding: 0;
	}

	.sheet__pull-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--sheet-ink);
		opacity: 0.75;
		margin-bottom: 14px;
	}

	.sheet__pull-text {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(22px, 2.8vw, 32px);
		line-height: 1.2;
		letter-spacing: -0.015em;
		color: var(--sheet-ink);
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
			transform: translateY(28px);
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
