<script lang="ts">
	import { browser } from '$app/environment';
	import { VERT_NAMES, type Archetype } from '$lib/archetypes';
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

		<article class="sheet__paper" tabindex="-1" bind:this={dialogEl} data-testid="vert-sheet-paper">
			<header class="sheet__head">
				<span class="sheet__eyebrow">
					<span class="sheet__eyebrow-mark" aria-hidden="true">№</span>
					on being &nbsp;<em>an {meta.name.toLowerCase()}</em>
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

			<div class="sheet__lede">
				<p class="sheet__name-line">
					<span class="sheet__dot" aria-hidden="true"></span>
					<span class="sheet__name">{meta.name}</span>
					<span class="sheet__sep" aria-hidden="true">·</span>
					<span class="sheet__label">{meta.label}</span>
				</p>
				<h2 id="vert-sheet-title" class="sheet__headline">{desc.headline}</h2>
				<p class="sheet__body">{desc.body}</p>
			</div>

			<section class="sheet__day" aria-labelledby="vert-sheet-day">
				<h3 id="vert-sheet-day" class="sheet__h3">
					<span class="sheet__h3-mark" aria-hidden="true">i.</span>
					<span>A day in the life</span>
				</h3>
				<p class="sheet__day-text">{desc.deep.dayInTheLife}</p>
			</section>

			<section class="sheet__truths" aria-labelledby="vert-sheet-truths">
				<h3 id="vert-sheet-truths" class="sheet__h3">
					<span class="sheet__h3-mark" aria-hidden="true">ii.</span>
					<span>Five things that are true and you've never told anyone</span>
				</h3>
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

			<section class="sheet__saints" aria-labelledby="vert-sheet-saints">
				<h3 id="vert-sheet-saints" class="sheet__h3">
					<span class="sheet__h3-mark" aria-hidden="true">iii.</span>
					<span>Patron saints, unofficial</span>
				</h3>
				<ul class="sheet__saint-list">
					{#each desc.deep.patronSaints as saint (saint)}
						<li class="sheet__saint">{saint}</li>
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
				<span class="sheet__pull-eyebrow">You'll never admit it, but —</span>
				<p class="sheet__pull-text">{desc.deep.youllNeverAdmit}</p>
			</aside>
		</article>
	</div>
{/if}

<style>
	/* Sheet is a fixed-position editorial spread that overlays the entire
	   viewport. The `.sheet__paper` article is the actual content surface;
	   the scrim sits behind it and dismisses on click. Everything is bound to
	   `--sheet-{soft|mid|ink}` set inline from the active archetype so
	   colours match the bar the user clicked. */
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

	.sheet__paper {
		position: relative;
		justify-self: center;
		align-self: stretch;
		width: 100%;
		max-width: 760px;
		max-height: 100vh;
		overflow-y: auto;
		padding: clamp(40px, 6vh, 88px) clamp(20px, 5vw, 64px) clamp(48px, 8vh, 96px);
		background: var(--paper);
		color: var(--ink);
		box-shadow: 0 40px 120px -40px color-mix(in oklab, var(--ink) 70%, transparent);
		animation: paper-in 320ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
		outline: none;
	}

	/* Subtle archetype-tinted radial wash on the paper itself, anchored
	   top-left. Echoes the result page's `.result::before`. */
	.sheet__paper::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: radial-gradient(
			ellipse 60% 50% at 8% 6%,
			color-mix(in oklab, var(--sheet-soft) 80%, transparent) 0%,
			transparent 70%
		);
		pointer-events: none;
	}

	@media (min-width: 760px) {
		.sheet {
			padding: clamp(20px, 4vh, 56px);
			place-items: center;
		}
		.sheet__paper {
			max-height: min(92vh, 920px);
			border-radius: var(--card-radius);
			border: 1px solid var(--ink-08);
		}
	}

	.sheet__head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 28px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--ink-08);
	}

	.sheet__eyebrow {
		display: inline-flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 6px 10px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-70);
	}

	.sheet__eyebrow em {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 13px;
		letter-spacing: 0;
		text-transform: none;
		color: var(--sheet-ink);
	}

	.sheet__eyebrow-mark {
		font-family: var(--font-display);
		font-size: 17px;
		color: var(--sheet-mid);
	}

	/* Editorial close — italic display word with a small sans glyph beside it,
	   mirroring the retake button on the result page. Underline appears on
	   hover/focus so the affordance is unmistakable without shouting. */
	.sheet__close {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		padding: 4px 2px;
		background: transparent;
		border: none;
		border-bottom: 1px solid transparent;
		color: var(--ink);
		font-family: var(--font-display);
		font-size: 18px;
		line-height: 1;
		cursor: pointer;
		transition:
			border-color 0.18s ease,
			color 0.18s ease,
			gap 0.2s ease;
	}

	.sheet__close em {
		font-style: italic;
	}

	.sheet__close-glyph {
		font-family: var(--font-sans);
		font-size: 18px;
		color: var(--ink-70);
		transition:
			color 0.18s ease,
			transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.sheet__close:hover,
	.sheet__close:focus-visible {
		border-bottom-color: var(--sheet-mid);
		gap: 12px;
	}

	.sheet__close:hover .sheet__close-glyph,
	.sheet__close:focus-visible .sheet__close-glyph {
		color: var(--sheet-mid);
		transform: rotate(90deg);
	}

	.sheet__close:focus-visible {
		outline: none;
		color: var(--sheet-ink);
	}

	.sheet__lede {
		margin-bottom: 56px;
	}

	.sheet__name-line {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		margin: 0 0 18px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ink-70);
	}

	.sheet__dot {
		width: 9px;
		height: 9px;
		border-radius: 999px;
		background: var(--sheet-mid);
	}

	.sheet__name {
		font-family: var(--font-display);
		font-size: 16px;
		letter-spacing: 0;
		text-transform: none;
		color: var(--ink);
		font-style: italic;
	}

	.sheet__sep {
		color: var(--ink-30);
	}

	.sheet__label {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 14px;
		letter-spacing: 0;
		text-transform: none;
		color: var(--ink-70);
	}

	.sheet__headline {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(34px, 5.6vw, 60px);
		line-height: 1.02;
		letter-spacing: -0.025em;
		margin: 0 0 28px;
		text-wrap: balance;
		color: var(--ink);
	}

	.sheet__body {
		max-width: 56ch;
		font-family: var(--font-display);
		font-size: clamp(17px, 1.6vw, 19px);
		line-height: 1.55;
		color: var(--ink-70);
		margin: 0;
		text-wrap: pretty;
		white-space: pre-wrap;
	}

	.sheet__h3 {
		display: flex;
		align-items: baseline;
		gap: 14px;
		font-family: var(--font-display);
		font-weight: 400;
		font-style: italic;
		font-size: clamp(22px, 2.4vw, 28px);
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 0 0 24px;
		text-wrap: balance;
	}

	.sheet__h3-mark {
		font-family: var(--font-mono);
		font-style: normal;
		font-size: 13px;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: var(--sheet-mid);
		min-width: 22px;
	}

	/* "A day in the life" — the centrepiece. Larger display-serif paragraph
	   with a subtle drop-cap and tighter measure than the body. */
	.sheet__day {
		margin: 0 0 56px;
	}

	.sheet__day-text {
		max-width: 60ch;
		font-family: var(--font-display);
		font-size: clamp(18px, 1.7vw, 21px);
		line-height: 1.55;
		color: var(--ink);
		margin: 0;
		text-wrap: pretty;
	}

	.sheet__day-text::first-letter {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 3.4em;
		line-height: 0.9;
		float: left;
		padding: 0.05em 0.12em 0 0;
		color: var(--sheet-ink);
	}

	.sheet__truths {
		margin-bottom: 56px;
	}

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
		border-top: 1px solid var(--ink-08);
	}

	.sheet__truth:first-child {
		padding-top: 0;
		border-top: none;
	}

	.sheet__truth-num {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--sheet-mid);
		font-variant-numeric: tabular-nums;
	}

	.sheet__truth-text {
		font-size: 16px;
		line-height: 1.55;
		color: var(--ink);
		text-wrap: pretty;
	}

	/* Patron saints — the magazine equivalent of fan-cast credits. Each item
	   reads as a hand-set entry rather than a bulleted list. */
	.sheet__saints {
		margin-bottom: 56px;
	}

	.sheet__saint-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.sheet__saint {
		position: relative;
		padding: 4px 0 4px 24px;
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(17px, 1.7vw, 19px);
		line-height: 1.4;
		color: var(--ink);
		text-wrap: pretty;
	}

	.sheet__saint::before {
		content: '✦';
		position: absolute;
		left: 0;
		top: 0.35em;
		font-family: var(--font-sans);
		font-style: normal;
		font-size: 11px;
		color: var(--sheet-mid);
	}

	.sheet__defs {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0;
		margin: 0 0 56px;
		padding: 28px 0;
		border-top: 1px solid var(--ink-08);
		border-bottom: 1px solid var(--ink-08);
	}

	.sheet__def {
		display: grid;
		grid-template-columns: 1fr;
		gap: 6px;
		padding: 18px 0;
	}

	.sheet__def + .sheet__def {
		border-top: 1px dashed var(--ink-12);
	}

	.sheet__def dt {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--sheet-ink);
		margin: 0;
	}

	.sheet__def dd {
		margin: 0;
		font-size: 16px;
		line-height: 1.6;
		color: var(--ink);
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

	/* Closing pull-quote — the "you'll never admit it" line. Big, italic,
	   tinted with the archetype's mid hue. The eyebrow above keeps the
	   editorial frame. */
	.sheet__pull {
		margin: 0;
		padding: 32px 0 0;
	}

	.sheet__pull-eyebrow {
		display: block;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--sheet-ink);
		margin-bottom: 14px;
	}

	.sheet__pull-text {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(22px, 2.8vw, 30px);
		line-height: 1.25;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 0;
		text-wrap: balance;
		max-width: 32ch;
	}

	@keyframes sheet-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes paper-in {
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
		.sheet__paper {
			animation: none;
		}
		.sheet__close-glyph {
			transition: none;
		}
	}
</style>
