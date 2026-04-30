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
				Most quizzes only know two: introvert, extrovert. We added three more —
				<em>ambivert</em> (context-flexible),
				<em>omnivert</em> (oscillates between extremes), and
				<em>otrovert</em> (a 2025 construct from psychiatrist Rami Kaminski; belongs without
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
		{@const bodyParas = descriptions[dominant].body.split('\n\n')}
		<section
			id="result"
			class="result"
			aria-labelledby="result-title"
			data-dominant={dominant}
			style:--dominant-soft="var(--vert-{dominant}-soft)"
			style:--dominant-mid="var(--vert-{dominant}-mid)"
			style:--dominant-ink="var(--vert-{dominant}-ink)"
		>
			<div class="result__inner">
				<header class="block">
					<p class="block__eyebrow">
						<span class="block__num" aria-hidden="true">i.</span>
						<span class="block__label">Verdict</span>
						<span class="block__meta">— {store.total} of {store.total} answered</span>
					</p>
					<h2 id="result-title" class="result__title">
						You are an <em>{VERT_NAMES[dominant].name}</em>.
					</h2>
					<p class="result__headline">{descriptions[dominant].headline}</p>
					{#each bodyParas as para, i (i)}
						<p class="result__prose">{para}</p>
					{/each}
					<div class="block__cta-row">
						<button
							type="button"
							class="block__cta"
							onclick={() => openSheet(dominant)}
							data-testid="result-read-guide-button"
						>
							<em>Read all about it</em>
							<span class="block__cta-glyph" aria-hidden="true">→</span>
						</button>
					</div>
				</header>

				<section class="block" aria-labelledby="result-breakdown">
					<p id="result-breakdown" class="block__eyebrow">
						<span class="block__num" aria-hidden="true">ii.</span>
						<span class="block__label">Five-vert breakdown</span>
						<span class="block__meta">— independent fits, tap any vert to read its guide</span>
					</p>
					<ul class="result__bars">
						{#each VERT_ORDER as vert, i (vert)}
							{@const fit = result.fits.find((f) => f.archetype === vert)?.fit ?? 0}
							<li
								class="result__bar"
								data-dominant={vert === dominant}
								style:--bar-delay="{i * 90}ms"
							>
								<button
									type="button"
									class="result__bar-button"
									data-archetype={vert}
									data-testid="result-bar-button-{vert}"
									aria-label="Read what it means to be {VERT_NAMES[
										vert
									].name.toLowerCase()} — {fit.toFixed(1)} percent fit"
									onclick={() => openSheet(vert)}
								>
									<span class="result__bar-name">{VERT_NAMES[vert].name}</span>
									<span class="result__bar-track" aria-hidden="true">
										<span
											class="result__bar-fill"
											style:--bar-width="{fit}%"
											style:background="var(--vert-{vert}-mid)"
										></span>
									</span>
									<span class="result__bar-pct">{fit.toFixed(1)}%</span>
									<span class="result__bar-glyph" aria-hidden="true">→</span>
								</button>
							</li>
						{/each}
					</ul>
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
			</div>
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
		/* No `overflow: hidden` — sticky descendants need an unclipped
		   ancestor, and the global `<ChapterIntro>` sits at the top of
		   `<main>` outside this section either way. The radial-gradient
		   `::before` is bounded by `inset: 0` and fades to transparent
		   before the section edges, so clipping isn't required. */
	}

	.result__inner {
		max-width: 760px;
		margin: 0 auto;
		padding: clamp(56px, 9vh, 112px) clamp(16px, 4vw, 64px);
	}

	/* Soft archetype-tinted wash anchored top-left, fading to nothing.
	   Bound to `--dominant-soft` (set inline from result.dominant) so the
	   atmosphere matches the user's headline result. */
	.result::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			radial-gradient(
				ellipse 70% 60% at 12% 8%,
				color-mix(in oklab, var(--dominant-soft, var(--paper)) 75%, transparent) 0%,
				transparent 70%
			),
			var(--paper);
		pointer-events: none;
	}

	/* The result section is one editorial spread, three blocks (verdict /
	   breakdown / colophon). Each block carries the same eyebrow shape so
	   the typographic system stays uniform. The block stack is the only
	   spacing rhythm — content inside a block uses tighter, intentional
	   margins and never invents its own gap with the next section. */
	.block + .block {
		margin-top: clamp(72px, 10vh, 120px);
	}

	.block__eyebrow {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 4px 10px;
		margin: 0 0 28px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-70);
	}

	.block__num {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 15px;
		letter-spacing: 0;
		text-transform: none;
		color: var(--dominant-ink, var(--ink));
	}

	.block__label {
		color: var(--ink);
	}

	.block__meta {
		letter-spacing: 0.12em;
		color: var(--ink-50);
	}

	/* Right-aligned CTA row — sits opposite the body paragraphs (which hang
	   on the left margin), so the "read on" gesture lands at the corner you
	   naturally finish reading at. */
	.block__cta-row {
		display: flex;
		justify-content: flex-end;
		margin-top: 32px;
	}

	/* Block-level call-to-action — italic display + arrow glyph, archetype-
	   tinted underline. Sits at the foot of a block as the natural "read on"
	   gesture. Same primitive shape as the sheet's close button so the two
	   ends of the editorial loop feel related. */
	.block__cta {
		display: inline-flex;
		align-items: baseline;
		gap: 12px;
		padding: 6px 0 8px;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--dominant-mid, var(--ink));
		color: var(--ink);
		font-family: var(--font-display);
		font-size: clamp(20px, 2.4vw, 26px);
		line-height: 1.1;
		cursor: pointer;
		transition:
			gap 0.2s ease,
			color 0.2s ease;
	}

	.block__cta em {
		font-style: italic;
	}

	.block__cta-glyph {
		font-family: var(--font-sans);
		font-style: normal;
		font-size: 18px;
		color: var(--dominant-mid, var(--ink-70));
		transition:
			transform 0.22s cubic-bezier(0.2, 0.7, 0.3, 1),
			color 0.18s ease;
	}

	.block__cta:hover,
	.block__cta:focus-visible {
		gap: 18px;
		color: var(--dominant-ink, var(--ink));
	}

	.block__cta:hover .block__cta-glyph,
	.block__cta:focus-visible .block__cta-glyph {
		transform: translateX(6px);
		color: var(--dominant-ink, var(--ink));
	}

	.block__cta:focus-visible {
		outline: 2px solid var(--dominant-mid, var(--ink));
		outline-offset: 4px;
		border-radius: 2px;
	}

	.result__title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(48px, 8vw, 96px);
		line-height: 1;
		letter-spacing: -0.03em;
		margin: 0 0 24px;
		text-wrap: balance;
	}

	.result__title em {
		font-style: italic;
		color: var(--dominant-ink, var(--ink));
	}

	/* Voice-led headline from `descriptions[archetype].headline`. Italic
	   display, metaphor-first — the visual bridge between the title and the
	   body paragraphs. */
	.result__headline {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(22px, 2.8vw, 30px);
		line-height: 1.25;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 0 0 28px;
		max-width: 32ch;
		text-wrap: balance;
	}

	.result__prose {
		max-width: 56ch;
		font-family: var(--font-display);
		font-size: clamp(17px, 1.5vw, 19px);
		line-height: 1.55;
		color: var(--ink-70);
		margin: 0 0 18px;
		text-wrap: pretty;
	}

	.result__prose:last-of-type {
		margin-bottom: 0;
	}

	.result__bars {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.result__bar {
		opacity: 0;
		animation: result-bar-in 520ms cubic-bezier(0.2, 0.7, 0.3, 1) var(--bar-delay, 0ms) both;
	}

	/* Each bar is the actual click target. Reset the native button surface so
	   it inherits the editorial paper backdrop, then re-do the grid layout.
	   The trailing arrow glyph is the affordance — it slides on hover and
	   becomes a coloured ink mark on focus. */
	.result__bar-button {
		display: grid;
		grid-template-columns: minmax(96px, 120px) 1fr auto 18px;
		align-items: center;
		gap: 16px;
		width: 100%;
		padding: 8px 12px 8px 8px;
		margin: -8px -12px -8px -8px;
		background: transparent;
		border: none;
		border-radius: 12px;
		color: inherit;
		font-family: var(--font-mono);
		font-size: 12px;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.18s ease,
			transform 0.18s ease;
	}

	.result__bar-button:hover {
		background: color-mix(in oklab, var(--ink-08) 55%, transparent);
	}

	.result__bar-button:focus-visible {
		outline: 2px solid var(--dominant-mid, var(--ink));
		outline-offset: 2px;
		background: color-mix(in oklab, var(--ink-08) 55%, transparent);
	}

	/* Affordance arrow — visible at rest so the bar reads as a clickable
	   link, not a static stat. Brightens and slides on hover/focus. */
	.result__bar-glyph {
		font-family: var(--font-sans);
		font-size: 16px;
		color: var(--ink-30);
		opacity: 0.55;
		transform: translateX(0);
		transition:
			opacity 0.18s ease,
			transform 0.22s cubic-bezier(0.2, 0.7, 0.3, 1),
			color 0.18s ease;
	}

	.result__bar-button:hover .result__bar-glyph,
	.result__bar-button:focus-visible .result__bar-glyph {
		opacity: 1;
		transform: translateX(4px);
		color: var(--ink);
	}

	.result__bar[data-dominant='true'] .result__bar-glyph {
		color: var(--dominant-mid, var(--ink-70));
		opacity: 0.6;
		transform: none;
	}

	.result__bar[data-dominant='true'] .result__bar-name,
	.result__bar[data-dominant='true'] .result__bar-pct {
		font-weight: 500;
		color: var(--ink);
	}

	.result__bar-name {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 18px;
		color: var(--ink-70);
	}

	.result__bar-track {
		height: 8px;
		border-radius: 999px;
		background: var(--ink-08);
		overflow: hidden;
		position: relative;
	}

	.result__bar[data-dominant='true'] .result__bar-track {
		height: 12px;
	}

	.result__bar-fill {
		display: block;
		height: 100%;
		width: 0;
		border-radius: 999px;
		animation: result-bar-fill 720ms cubic-bezier(0.2, 0.7, 0.3, 1)
			calc(var(--bar-delay, 0ms) + 120ms) both;
	}

	@keyframes result-bar-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes result-bar-fill {
		from {
			width: 0;
		}
		to {
			width: var(--bar-width, 0%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.result__bar {
			opacity: 1;
			animation: none;
		}
		.result__bar-fill {
			width: var(--bar-width, 0%);
			animation: none;
		}
	}

	.result__bar-pct {
		font-variant-numeric: tabular-nums;
		color: var(--ink-70);
		min-width: 56px;
		text-align: right;
	}

	/* Colophon — the third block. Sits below the breakdown with the same
	   block-rhythm spacing the other two follow, plus a hairline rule above
	   so the retake reads as the page's quiet "turn over" gesture. */
	.result__colophon {
		margin-top: clamp(72px, 10vh, 120px);
		padding-top: 32px;
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
