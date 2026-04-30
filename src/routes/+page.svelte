<script lang="ts">
	import { browser } from '$app/environment';
	import {
		ACCENT_ROTATION,
		CHAPTERS,
		DIMENSION_META,
		VERT_NAMES,
		VERT_ORDER,
		type Archetype,
		type Chapter
	} from '$lib/archetypes';
	import ChapterIntro from '$lib/components/ChapterIntro.svelte';
	import FiveDots from '$lib/components/FiveDots.svelte';
	import ProgressMeter from '$lib/components/ProgressMeter.svelte';
	import QuestionRow from '$lib/components/QuestionRow.svelte';
	import Tagline from '$lib/components/Tagline.svelte';
	import VertSheet from '$lib/components/VertSheet.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import { descriptions } from '$lib/descriptions';
	import { questions } from '$lib/questions';
	import { createAnswersStore, QUESTIONS_BY_DIMENSION } from '$lib/state/answers.svelte';
	import { APP_VERSION } from '$lib/version';

	const store = createAnswersStore();
	const grouped = QUESTIONS_BY_DIMENSION;
	const questionCount = questions.length;
	const pageDescription = `A five-sided personality quiz. Introvert, extrovert, ambivert, omnivert, otrovert — ${questionCount} questions, one slider, a five-way breakdown at the end.`;

	let activeChapter = $state<Chapter | null>(null);
	let resultActive = $state(false);
	let scrollY = $state(0);
	let sheetArchetype = $state<Archetype | null>(null);

	function openSheet(archetype: Archetype) {
		sheetArchetype = archetype;
	}

	function closeSheet() {
		sheetArchetype = null;
	}

	const meterVisible = $derived(scrollY > 80);

	/* The single sticky banner at the top of `<main>` is driven by this
	   derived bag of ChapterIntro props. Result takes precedence when its
	   section is intersecting; otherwise the last visited chapter wins. */
	const activeSection = $derived.by(() => {
		if (resultActive && store.result) {
			return {
				numeral: 'V' as const,
				title: 'Result',
				archetype: store.result.dominant,
				count: 5,
				countLabel: 'verts',
				description: 'Five independent fits — bars do not sum to 100.'
			};
		}
		if (activeChapter) {
			return {
				numeral: activeChapter.numeral,
				title: activeChapter.title,
				archetype: activeChapter.archetype,
				count: grouped[activeChapter.dimension].length,
				countLabel: 'statements',
				description: DIMENSION_META[activeChapter.dimension].description
			};
		}
		return null;
	});

	$effect(() => {
		if (!browser) return;

		const chapterTargets = CHAPTERS.flatMap((ch) => {
			const el = document.getElementById(ch.id);
			if (!el) {
				console.warn(`[IntersectionObserver] Chapter element #${ch.id} not found — skipped`);
				return [];
			}
			return [{ chapter: ch, el }];
		});

		const chapterObserver = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
				if (visible.length === 0) return;
				const first = visible[0]!;
				const match = chapterTargets.find((c) => c.el === first.target);
				if (match) activeChapter = match.chapter;
			},
			{ rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
		);
		chapterTargets.forEach(({ el }) => chapterObserver.observe(el));

		return () => chapterObserver.disconnect();
	});

	/* Result section gets its own observer because it only renders once the
	   user has answered every question, so it isn't in the DOM when the
	   chapter observer above is wired up. The store.result dependency
	   re-runs the effect when the section enters the tree. The boolean is
	   live (true while the section is intersecting, false when not), so
	   scrolling back up into chapters cleanly hands the global banner back
	   to `activeChapter`. */
	$effect(() => {
		if (!browser) return;
		if (!store.result) {
			resultActive = false;
			return;
		}
		const el = document.getElementById('result');
		if (!el) return;
		const obs = new IntersectionObserver(
			([entry]) => {
				resultActive = entry?.isIntersecting ?? false;
			},
			{ rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
		);
		obs.observe(el);
		return () => obs.disconnect();
	});

	const firstChapter = CHAPTERS[0];

	const prefersReducedMotion = (): boolean =>
		globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

	function scrollToId(id: string, event?: Event) {
		if (!browser) return;
		event?.preventDefault();
		const el = document.getElementById(id);
		if (!el) {
			console.warn(`[scrollToId] Element #${id} not found — scroll skipped`);
			return;
		}
		const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
		el.scrollIntoView({ behavior, block: 'start' });
	}

	const scrollToFirstChapter = (event: MouseEvent) => {
		if (firstChapter) scrollToId(firstChapter.id, event);
	};

	function handleRetake() {
		if (autoScrollTimer !== null) {
			clearTimeout(autoScrollTimer);
			autoScrollTimer = null;
		}
		store.reset();
		if (!browser) return;
		const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
		window.scrollTo({ top: 0, behavior });
	}

	/**
	 * Forward-progress feedback. The lock itself is layout-only (CSS
	 * `.row[data-state='unset'] ~ .row` removes later content from layout),
	 * so the user physically cannot scroll past the gating row. But a silent
	 * dead end is bad UX — modern browsers don't all rubber-band on
	 * desktop, and a forward wheel-tick that does nothing reads as broken.
	 *
	 * Listeners are passive (no preventDefault) — we only observe intent
	 * and bump `nudgeAt`, which the gating row picks up to play a soft
	 * rubber-band animation + emit a haptic tap on devices that support it.
	 * The browser's native scroll model is never interfered with.
	 */
	let nudgeAt = $state(0);
	let autoScrollTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (!browser) return;
		const NUDGE_DEBOUNCE_MS = 700;
		let lastNudge = 0;
		let touchStartY = 0;

		const atDocumentBottom = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			return window.scrollY >= max - 2;
		};

		const fire = () => {
			const now = Date.now();
			if (now - lastNudge < NUDGE_DEBOUNCE_MS) return;
			lastNudge = now;
			nudgeAt = now;
			// Honour reduced-motion AND respect platforms where vibrate is a
			// no-op or unsupported (iOS, desktop). The optional chain handles
			// both the unsupported and the consent-revoked cases.
			if (!prefersReducedMotion()) navigator.vibrate?.(8);
		};

		const onWheel = (event: WheelEvent) => {
			if (event.deltaY > 0 && atDocumentBottom()) fire();
		};

		const onTouchStart = (event: TouchEvent) => {
			touchStartY = event.touches[0]?.clientY ?? 0;
		};

		const onTouchMove = (event: TouchEvent) => {
			const currentY = event.touches[0]?.clientY ?? 0;
			// Positive delta = finger swept up (i.e., trying to scroll forward).
			// 8px is the noise threshold — below that, tiny finger jitter
			// during a tap on the slider would fire false positives.
			if (touchStartY - currentY > 8 && atDocumentBottom()) fire();
		};

		window.addEventListener('wheel', onWheel, { passive: true });
		window.addEventListener('touchstart', onTouchStart, { passive: true });
		window.addEventListener('touchmove', onTouchMove, { passive: true });
		// Hydration signal so E2E specs can wait until the listener is armed.
		document.body.dataset.nudgeListener = 'on';

		return () => {
			window.removeEventListener('wheel', onWheel);
			window.removeEventListener('touchstart', onTouchStart);
			window.removeEventListener('touchmove', onTouchMove);
			delete document.body.dataset.nudgeListener;
		};
	});

	/**
	 * Auto-advance after a commit. The forward-progress lock itself is
	 * declarative (see app.css `.row[data-state='unset'] ~ .row`) — content
	 * past the current question is not laid out, so the user physically
	 * cannot scroll past it. Auto-advance just nudges the viewport onto the
	 * row that has just become visible.
	 *
	 * Skipped when the immediate next question is already answered (the user
	 * is revising an earlier answer, not progressing). When the commit was
	 * the last unanswered question, we scroll to the submit panel instead —
	 * it has just transitioned into layout for the same reason.
	 */
	function handleAnswerCommit(qId: string) {
		if (!browser) return;
		const idx = questions.findIndex((q) => q.id === qId);
		if (idx < 0) return;
		const next = questions[idx + 1];
		if (next && store.answers[next.id]?.state === 'answered') return;
		// Last commit lands the user directly on the result — finishing the
		// quiz IS the submit, no intermediary panel.
		const targetId = next ? `q-${next.id}` : 'result';
		const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
		if (autoScrollTimer !== null) clearTimeout(autoScrollTimer);
		autoScrollTimer = setTimeout(() => {
			autoScrollTimer = null;
			const el = document.getElementById(targetId);
			if (!el) {
				console.warn(`[handleAnswerCommit] Scroll target #${targetId} not found`);
				return;
			}
			el.scrollIntoView({ behavior, block: 'start' });
		}, 450);
	}
</script>

<svelte:head>
	<title>Multivert — what vert are you?</title>
	<meta name="description" content={`${pageDescription} Answers stay on your device.`} />
	<meta name="theme-color" content="#1a1815" media="(prefers-color-scheme: dark)" />
	<meta name="theme-color" content="#f8f7f4" media="(prefers-color-scheme: light)" />

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Multivert — what vert are you?" />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:site_name" content="Multivert" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Multivert — what vert are you?" />
	<meta
		name="twitter:description"
		content={`A five-sided personality quiz. ${questionCount} questions, one slider, a five-way breakdown at the end.`}
	/>
</svelte:head>

<svelte:window bind:scrollY />

<ProgressMeter
	total={store.total}
	answered={store.totalAnswered}
	chapter={activeChapter ? `${activeChapter.numeral} · ${activeChapter.title}` : null}
	visible={meterVisible}
/>

<header class="hero">
	<div class="hero__bar">
		<Wordmark size={22} />
		<nav class="hero__nav">
			<a href="#chapter-energy" onclick={(e) => scrollToId('chapter-energy', e)}>
				The five verts
			</a>
			<FiveDots />
		</nav>
	</div>

	<div class="hero__grid">
		<div>
			<div class="hero__eyebrow">
				<span class="hero__eyebrow-rule" aria-hidden="true"></span>
				A personality quiz, properly five-sided
			</div>

			<h1 class="hero__headline">
				Which of the
				<em>five&nbsp;verts</em>
				are&nbsp;you?
			</h1>

			<p class="hero__lede">
				Most quizzes only know two: introvert, extrovert. There are three more —
				<em>ambivert</em> (context-flexible),
				<em>omnivert</em> (oscillates between extremes), and
				<em>otrovert</em> (a 2025 term coined by psychiatrist Rami Kaminski; belongs without
				belonging). {questions.length} statements, one quiet slider, a five-way breakdown at the end.
			</p>

			<div class="hero__cta-row">
				<button class="hero__cta" type="button" onclick={scrollToFirstChapter}>
					Begin <span aria-hidden="true">↓</span>
				</button>
				<p class="hero__cta-meta">
					{questions.length} questions · ~6 minutes · scroll-paced · answers stay on your device
				</p>
			</div>
		</div>

		<aside class="hero__card">
			<div class="hero__card-eyebrow">The five verts</div>
			<ul class="hero__card-list">
				{#each VERT_ORDER as vert, i (vert)}
					<li class="hero__card-item" class:hero__card-item--first={i === 0}>
						<span
							class="hero__card-dot"
							style:background="var(--vert-{vert}-mid)"
							aria-hidden="true"
						></span>
						<span class="hero__card-name">{VERT_NAMES[vert].name}</span>
						<span class="hero__card-label">{VERT_NAMES[vert].label}</span>
					</li>
				{/each}
			</ul>
		</aside>
	</div>
</header>

<main class="quiz">
	{#if activeSection}
		<ChapterIntro id="active-chapter-head" {...activeSection} />
	{/if}

	{#each CHAPTERS as chapter, ci (chapter.id)}
		<section
			id={chapter.id}
			class="chapter-wrap"
			aria-label="Chapter {chapter.numeral} — {chapter.title}"
			data-archetype={chapter.archetype}
		>
			{#each grouped[chapter.dimension] as q, qi (q.id)}
				{@const globalIndex =
					CHAPTERS.slice(0, ci).reduce((sum, c) => sum + grouped[c.dimension].length, 0) + qi}
				{@const accent = ACCENT_ROTATION[globalIndex % ACCENT_ROTATION.length] ?? 'otrovert'}
				{@const entry = store.answers[q.id] ?? { state: 'unset', value: null }}
				<QuestionRow
					question={q}
					index={globalIndex}
					total={store.total}
					{accent}
					value={entry.value}
					phase={entry.state}
					nudgeAt={entry.state === 'unset' ? nudgeAt : 0}
					onchange={(next) => {
						store.setAnswer(q.id, next);
						if (next.state === 'answered') handleAnswerCommit(q.id);
					}}
				/>
			{/each}
		</section>
	{/each}

	{#if store.result}
		{@const result = store.result}
		{@const dominant = result.dominant}
		{@const dominantFit = result.fits.find((f) => f.archetype === dominant)?.fit ?? 0}
		{@const dominantIndex = VERT_ORDER.indexOf(dominant)}
		{@const bodyParas = descriptions[dominant].body.split('\n\n')}
		<section
			id="result"
			class="result"
			aria-labelledby="result-title"
			data-dominant={dominant}
			style:--dominant-mid="var(--vert-{dominant}-mid)"
			style:--dominant-ink="var(--vert-{dominant}-ink)"
		>
			<!-- Pantone-style swatch hero — full-bleed dominant hue, archetype name as
			     the "color name," reference numerals top, swatch ink throughout. -->
			<div
				class="swatch"
				style:--swatch="var(--vert-{dominant}-mid)"
				style:--swatch-ink="var(--vert-{dominant}-ink)"
				style:--swatch-soft="var(--vert-{dominant}-soft)"
			>
				<header class="swatch__chrome">
					<span class="swatch__ref">
						№ {String(dominantIndex + 1).padStart(2, '0')}/05 &nbsp;·&nbsp; FIT {dominantFit.toFixed(
							1
						)}%
					</span>
					<span class="swatch__lot">multivert · {store.total}/{store.total}</span>
				</header>

				<h2 id="result-title" class="swatch__name">{VERT_NAMES[dominant].name.toUpperCase()}</h2>
				<p class="swatch__label">{VERT_NAMES[dominant].label}.</p>

				<div class="swatch__lede">
					<p class="swatch__headline">{descriptions[dominant].headline}</p>
					{#each bodyParas as para, i (i)}
						<p class="swatch__body">{para}</p>
					{/each}
				</div>

				<button
					type="button"
					class="swatch__cta"
					onclick={() => openSheet(dominant)}
					data-testid="result-read-guide-button"
				>
					<span>Read all about it</span>
					<span class="swatch__cta-glyph" aria-hidden="true">→</span>
				</button>
			</div>

			<!-- Breakdown — five swatch chips on paper. Click to open that vert's
			     sheet. Dominant chip carries an outlined ring that ties it back
			     to the hero above. -->
			<section class="breakdown" aria-label="Five-vert breakdown">
				<p class="breakdown__caption">
					<span>five-vert breakdown</span>
					<span class="breakdown__caption-rule" aria-hidden="true"></span>
					<span>tap any swatch to read its entry</span>
				</p>
				<ol class="breakdown__row">
					{#each VERT_ORDER as vert, i (vert)}
						{@const fit = result.fits.find((f) => f.archetype === vert)?.fit ?? 0}
						<li
							class="breakdown__chip"
							data-dominant={vert === dominant}
							style:--chip-color="var(--vert-{vert}-mid)"
							style:--chip-ink="var(--vert-{vert}-ink)"
							style:--chip-delay="{i * 60}ms"
						>
							<button
								type="button"
								class="breakdown__chip-button"
								data-archetype={vert}
								data-testid="result-bar-button-{vert}"
								aria-label="Read the entry for {VERT_NAMES[vert].name.toLowerCase()} — {fit.toFixed(
									1
								)} percent fit"
								onclick={() => openSheet(vert)}
							>
								<span class="breakdown__chip-num">№ {String(i + 1).padStart(2, '0')}</span>
								<span class="breakdown__chip-name">
									{VERT_NAMES[vert].name.toUpperCase()}
								</span>
								<span class="breakdown__chip-fit">
									<span class="breakdown__chip-fit-num">{fit.toFixed(1)}</span>
									<span class="breakdown__chip-fit-pct">%</span>
								</span>
							</button>
						</li>
					{/each}
				</ol>
			</section>

			<footer class="result__colophon">
				<button class="result__retake" type="button" onclick={handleRetake}>
					<em>Start over.</em>
					<span class="result__retake-glyph" aria-hidden="true">↺</span>
				</button>
				<p class="result__retake-meta">
					Clears your answers on this device and rolls the page back to the top.
				</p>
			</footer>
		</section>
	{/if}

	<footer class="page-footer">
		<Tagline size={11} align="left" />
		<div class="page-footer__version">{APP_VERSION}</div>
	</footer>
</main>

<VertSheet open={sheetArchetype !== null} archetype={sheetArchetype} onclose={closeSheet} />

<style>
	.hero {
		background: var(--paper);
		color: var(--ink);
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.hero__bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24px;
		border-bottom: 1px solid var(--ink-08);
	}

	.hero__nav {
		display: flex;
		align-items: center;
		gap: 28px;
		font-size: 13px;
		color: var(--ink-70);
	}

	.hero__nav a {
		color: inherit;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.hero__nav a:hover {
		color: var(--ink);
	}

	.hero__grid {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr;
		gap: 56px;
		padding: 64px 24px;
		max-width: 1280px;
		width: 100%;
		margin: 0 auto;
	}

	.hero__eyebrow {
		display: flex;
		align-items: center;
		gap: 12px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--ink-70);
		margin-bottom: 28px;
	}

	.hero__eyebrow-rule {
		display: block;
		width: 24px;
		height: 1px;
		background: var(--ink-30);
	}

	.hero__headline {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(56px, 9vw, 116px);
		line-height: 0.92;
		letter-spacing: -0.035em;
		margin: 0;
		text-wrap: balance;
	}

	.hero__headline em {
		font-style: italic;
		color: var(--vert-otrovert-ink);
	}

	.hero__lede {
		margin: 36px 0 0;
		max-width: 540px;
		font-size: 17px;
		line-height: 1.55;
		color: var(--ink-70);
	}

	.hero__cta-row {
		margin-top: 44px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 20px;
	}

	.hero__cta {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		height: 60px;
		padding: 0 28px;
		background: var(--ink);
		color: var(--paper);
		border: none;
		border-radius: var(--button-radius);
		font-family: var(--font-sans);
		font-size: 16px;
		font-weight: 500;
		letter-spacing: -0.005em;
		cursor: pointer;
		transition:
			transform 0.2s ease,
			background 0.2s ease;
	}

	.hero__cta:hover {
		transform: translateY(-1px);
	}

	.hero__cta:active {
		transform: translateY(0);
	}

	.hero__cta:focus-visible {
		outline: 2px solid var(--paper);
		outline-offset: 3px;
		box-shadow: 0 0 0 4px var(--ink);
	}

	.hero__cta-meta {
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.55;
		letter-spacing: 0.02em;
		color: var(--ink-70);
		margin: 0;
	}

	.hero__card {
		background: var(--paper-dk);
		border: 1px solid var(--ink-08);
		border-radius: var(--card-radius);
		padding: 32px;
		align-self: start;
	}

	.hero__card-eyebrow {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-70);
		margin-bottom: 20px;
	}

	.hero__card-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.hero__card-item {
		display: grid;
		grid-template-columns: 14px 110px 1fr;
		align-items: center;
		gap: 14px;
		padding: 14px 0;
		border-top: 1px solid var(--ink-12);
	}

	.hero__card-item--first {
		border-top: none;
	}

	.hero__card-dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
	}

	.hero__card-name {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 22px;
		letter-spacing: -0.02em;
	}

	.hero__card-label {
		font-size: 13px;
		color: var(--ink-70);
		line-height: 1.4;
	}

	@media (min-width: 960px) {
		.hero__grid {
			grid-template-columns: 1fr minmax(0, 480px);
			gap: 80px;
			padding: 96px 56px 96px;
			align-items: start;
		}
		.hero__bar {
			padding: 24px 56px;
		}
	}

	.quiz {
		background: var(--paper);
	}

	.chapter-wrap {
		position: relative;
		isolation: isolate;
		color: var(--ink);
		background: var(--paper);
	}

	.result {
		position: relative;
		isolation: isolate;
		background: var(--paper);
		scroll-margin-top: 72px;
	}

	/* ── Pantone-style swatch hero, behind glass ───────────────────────────
	   Full-bleed dominant hue, but softened — the hue itself is mixed into
	   paper (about 28% paper) so saturated reds/oranges don't shout, and a
	   top-left light-catch radial gradient sits on top to read as the
	   surface of a frosted glass card rather than a pure printed swatch.
	   The archetype name still functions as the colour name; type prints
	   in the deep tone-on-tone ink (`--vert-{name}-ink`). */
	.swatch {
		background:
			radial-gradient(
				ellipse 70% 55% at 18% 8%,
				color-mix(in oklab, white 30%, transparent) 0%,
				transparent 65%
			),
			color-mix(in oklab, var(--swatch) 72%, var(--paper));
		color: var(--swatch-ink);
		/* Top padding stays lean (sticky chapter banner is already 72px).
		   Bottom is generous-but-bounded so the swatch doesn't dominate the
		   page on tall viewports. */
		padding: clamp(32px, 5vh, 64px) clamp(20px, 5vw, 96px) clamp(48px, 8vh, 96px);
		position: relative;
		overflow: hidden;
	}

	/* A second, very faint glass sheen at the bottom-right — lifts the card
	   off the page edge and gives the surface depth without becoming a
	   gradient page. */
	.swatch::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			ellipse 50% 40% at 88% 92%,
			color-mix(in oklab, var(--swatch-ink) 14%, transparent) 0%,
			transparent 60%
		);
	}

	/* Stack the swatch's children above the ::after sheen. */
	.swatch > * {
		position: relative;
		z-index: 1;
	}

	/* Swatch chrome — the small mono band of "reference numbers" running
	   across the top of a Pantone card. Two columns, baseline aligned. */
	.swatch__chrome {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px 24px;
		flex-wrap: wrap;
		margin-bottom: clamp(32px, 6vh, 64px);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--swatch-ink);
		opacity: 0.85;
	}

	.swatch__ref {
		font-variant-numeric: tabular-nums;
	}

	.swatch__lot {
		font-variant-numeric: tabular-nums;
	}

	/* The colour name — heavy sans-serif, all-caps. Sized to dominate but
	   not so big it pushes the rest of the card off-screen. */
	.swatch__name {
		font-family: var(--font-sans);
		font-weight: 600;
		font-size: clamp(56px, 11vw, 144px);
		line-height: 0.88;
		letter-spacing: -0.04em;
		color: var(--swatch-ink);
		margin: 0;
		text-wrap: balance;
		text-transform: uppercase;
	}

	/* Tagline right-aligned to the swatch's right edge — mirrors the
	   chrome row's right column ("multivert · 35/35"), so the card reads
	   with two clean text columns: name on the left, identity strip on
	   the right. */
	.swatch__label {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(18px, 2vw, 24px);
		line-height: 1.2;
		color: var(--swatch-ink);
		opacity: 0.78;
		margin: clamp(8px, 1.4vh, 16px) 0 clamp(40px, 6vh, 64px);
		text-align: right;
	}

	.swatch__lede {
		max-width: 60ch;
		margin-bottom: clamp(28px, 4vh, 48px);
	}

	.swatch__headline {
		font-family: var(--font-sans);
		font-weight: 500;
		font-size: clamp(22px, 2.6vw, 30px);
		line-height: 1.2;
		letter-spacing: -0.015em;
		color: var(--swatch-ink);
		margin: 0 0 24px;
		max-width: 28ch;
		text-wrap: balance;
	}

	.swatch__body {
		font-family: var(--font-sans);
		font-size: clamp(15px, 1.4vw, 17px);
		line-height: 1.6;
		color: var(--swatch-ink);
		margin: 0 0 14px;
		max-width: 60ch;
		text-wrap: pretty;
		opacity: 0.92;
	}

	.swatch__body:last-of-type {
		margin-bottom: 0;
	}

	.swatch__cta {
		display: inline-flex;
		align-items: baseline;
		gap: 12px;
		padding: 8px 0;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--swatch-ink);
		color: var(--swatch-ink);
		font-family: var(--font-sans);
		font-weight: 500;
		font-size: clamp(15px, 1.4vw, 17px);
		letter-spacing: 0.01em;
		cursor: pointer;
		transition:
			gap 0.2s ease,
			opacity 0.2s ease;
	}

	.swatch__cta-glyph {
		font-family: var(--font-sans);
		font-size: 18px;
		transition: transform 0.22s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.swatch__cta:hover,
	.swatch__cta:focus-visible {
		gap: 18px;
		opacity: 0.7;
	}

	.swatch__cta:hover .swatch__cta-glyph,
	.swatch__cta:focus-visible .swatch__cta-glyph {
		transform: translateX(6px);
	}

	.swatch__cta:focus-visible {
		outline: 2px solid var(--swatch-ink);
		outline-offset: 6px;
	}

	/* ── Five-vert breakdown — a strip of swatch chips on paper ──────────
	   Each chip is its own miniature Pantone card: solid colour, mono № ref,
	   archetype name as the colour name, fit % as the swatch's "value." The
	   dominant chip is ringed in its own ink so it ties back to the hero. */
	.breakdown {
		background: var(--paper);
		padding: clamp(48px, 8vh, 96px) clamp(20px, 5vw, 64px);
	}

	.breakdown__caption {
		display: flex;
		align-items: center;
		gap: 16px;
		max-width: 1200px;
		margin: 0 auto 24px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-70);
	}

	.breakdown__caption-rule {
		flex: 1;
		height: 1px;
		background: var(--ink-12);
	}

	.breakdown__row {
		list-style: none;
		margin: 0 auto;
		padding: 0;
		max-width: 1200px;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
		gap: 6px;
	}

	.breakdown__chip {
		opacity: 0;
		animation: chip-in 480ms cubic-bezier(0.2, 0.7, 0.3, 1) var(--chip-delay, 0ms) both;
	}

	.breakdown__chip-button {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 24px;
		width: 100%;
		min-height: 200px;
		padding: 16px 18px 18px;
		background: var(--chip-color);
		color: var(--chip-ink);
		border: none;
		cursor: pointer;
		text-align: left;
		font: inherit;
		transition:
			transform 0.22s cubic-bezier(0.2, 0.7, 0.3, 1),
			box-shadow 0.22s ease;
	}

	.breakdown__chip-button:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 28px -16px color-mix(in oklab, var(--chip-ink) 60%, transparent);
	}

	.breakdown__chip-button:focus-visible {
		outline: 2px solid var(--chip-ink);
		outline-offset: 3px;
	}

	.breakdown__chip[data-dominant='true'] .breakdown__chip-button {
		outline: 2px solid var(--chip-ink);
		outline-offset: -8px;
	}

	.breakdown__chip-num {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-variant-numeric: tabular-nums;
		opacity: 0.85;
	}

	.breakdown__chip-name {
		font-family: var(--font-sans);
		font-weight: 600;
		font-size: clamp(14px, 1.4vw, 17px);
		letter-spacing: -0.01em;
		text-transform: uppercase;
		line-height: 1;
	}

	.breakdown__chip-fit {
		display: inline-flex;
		align-items: baseline;
		gap: 1px;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}

	.breakdown__chip-fit-num {
		font-size: clamp(22px, 2.4vw, 28px);
		line-height: 1;
	}

	.breakdown__chip-fit-pct {
		/* Sized at 0.55em the % glyph collapsed into an "s" shape — bumped
		   to 0.78em so it reads unambiguously as percent without competing
		   with the value. */
		font-size: 0.78em;
		opacity: 0.75;
	}

	@keyframes chip-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.breakdown__chip {
			opacity: 1;
			animation: none;
		}
		.breakdown__chip-button {
			transition: none;
		}
		.swatch__cta-glyph {
			transition: none;
		}
	}

	/* Colophon — sits under the breakdown on the paper background. Hairline
	   rule above, retake reads as the page's quiet "turn over" gesture. */
	.result__colophon {
		max-width: 1200px;
		margin: 0 auto;
		padding: 32px clamp(20px, 5vw, 64px) clamp(48px, 8vh, 96px);
		border-top: 1px solid var(--ink-08);
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 12px 28px;
	}

	/* Editorial typographic retake — italic display serif rather than a
	   utility button. Sits at the bottom as a quiet "turn the page" gesture
	   rather than another bold CTA competing with the dominant headline. */
	.result__retake {
		display: inline-flex;
		align-items: baseline;
		gap: 10px;
		padding: 0;
		background: transparent;
		color: var(--ink);
		border: none;
		border-bottom: 1px solid var(--ink-30);
		border-radius: 0;
		font-family: var(--font-display);
		font-size: clamp(20px, 2.4vw, 28px);
		line-height: 1.1;
		letter-spacing: -0.015em;
		cursor: pointer;
		padding-bottom: 4px;
		transition:
			border-color 0.2s ease,
			color 0.2s ease,
			gap 0.2s ease;
	}

	.result__retake em {
		font-style: italic;
	}

	.result__retake-glyph {
		font-family: var(--font-sans);
		font-size: 18px;
		font-style: normal;
		color: var(--ink-70);
		transition: transform 0.4s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.result__retake:hover {
		border-bottom-color: var(--dominant-mid, var(--ink));
		gap: 14px;
	}

	.result__retake:hover .result__retake-glyph {
		transform: rotate(-180deg);
		color: var(--dominant-mid, var(--ink));
	}

	.result__retake:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 6px;
	}

	.result__retake-meta {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--ink-70);
		margin: 0;
	}

	.page-footer {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		padding: 24px;
		gap: 16px;
	}

	.page-footer__version {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--ink-70);
	}

	@media (min-width: 960px) {
		.page-footer {
			padding: 32px 56px;
		}
	}
</style>
