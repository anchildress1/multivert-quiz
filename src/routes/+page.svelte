<script lang="ts">
	import { browser } from '$app/environment';
	import {
		ACCENT_ROTATION,
		CHAPTERS,
		DIMENSION_META,
		VERT_NAMES,
		VERT_ORDER,
		type Chapter
	} from '$lib/archetypes';
	import ChapterIntro from '$lib/components/ChapterIntro.svelte';
	import FiveDots from '$lib/components/FiveDots.svelte';
	import ProgressMeter from '$lib/components/ProgressMeter.svelte';
	import QuestionRow from '$lib/components/QuestionRow.svelte';
	import Tagline from '$lib/components/Tagline.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import { questions } from '$lib/questions';
	import { createAnswersStore, QUESTIONS_BY_DIMENSION } from '$lib/state/answers.svelte';
	import { APP_VERSION } from '$lib/version';

	const store = createAnswersStore();
	const grouped = QUESTIONS_BY_DIMENSION;
	const questionCount = questions.length;
	const pageDescription = `A five-sided personality quiz. Introvert, extrovert, ambivert, omnivert, otrovert — ${questionCount} questions, one slider, a five-way breakdown at the end.`;

	let activeChapter = $state<Chapter | null>(null);
	let scrollY = $state(0);

	const meterVisible = $derived(scrollY > 80);

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
		const targetId = next ? `q-${next.id}` : 'submit';
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
			<a href="#submit" onclick={(e) => scrollToId('submit', e)}>Submit</a>
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
	{#if activeChapter}
		{@const head = activeChapter}
		<ChapterIntro
			id="active-chapter-head"
			numeral={head.numeral}
			title={head.title}
			archetype={head.archetype}
			count={grouped[head.dimension].length}
			description={DIMENSION_META[head.dimension].description}
		/>
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

	<section id="submit" class="submit">
		<div class="submit__inner">
			<p class="submit__eyebrow">
				{store.totalAnswered} of {store.total} answered
			</p>
			<h2 class="submit__title">
				{#if store.allAnswered}
					That’s <em>all of them.</em><br />Want to see how you came out?
				{:else}
					Almost there — <em>{store.total - store.totalAnswered}</em> still need a&nbsp;slide.
				{/if}
			</h2>

			<button
				class="submit__cta"
				type="button"
				disabled={!store.allAnswered}
				aria-disabled={!store.allAnswered}
				onclick={() => scrollToId('result')}
			>
				{#if store.allAnswered}
					See my five-vert breakdown <span aria-hidden="true">→</span>
				{:else}
					{store.total - store.totalAnswered} more to go
				{/if}
			</button>

			<p class="submit__hint">
				Your answers stay on this device. We don’t persist anything to a server.
			</p>
		</div>
	</section>

	{#if store.result}
		{@const result = store.result}
		<section
			id="result"
			class="result"
			aria-labelledby="result-title"
			data-dominant={result.dominant}
			style:--dominant-soft="var(--vert-{result.dominant}-soft)"
			style:--dominant-mid="var(--vert-{result.dominant}-mid)"
			style:--dominant-ink="var(--vert-{result.dominant}-ink)"
		>
			<header
				class="result-head"
				style:--accent="var(--dominant-mid)"
				style:--accent-ink="var(--dominant-ink)"
			>
				<span class="result-head__numeral" aria-hidden="true">V</span>
				<div class="result-head__rule" aria-hidden="true"></div>
				<div class="result-head__copy">
					<h2 class="result-head__title"><em>Result</em></h2>
					<p class="result-head__description">Five independent fits — bars do not sum to 100.</p>
				</div>
				<span class="result-head__count">5 verts</span>
			</header>

			<div class="result__inner">
				<p class="result__eyebrow">your result · {store.total} of {store.total} answered</p>
				<h2 id="result-title" class="result__title">
					You are an <em>{VERT_NAMES[result.dominant].name}</em>.
				</h2>
				<p class="result__lede">{VERT_NAMES[result.dominant].label}</p>
				<p class="result__prose">{VERT_NAMES[result.dominant].prose}</p>

				<ul class="result__bars">
					{#each VERT_ORDER as vert, i (vert)}
						{@const fit = result.fits.find((f) => f.archetype === vert)?.fit ?? 0}
						<li
							class="result__bar"
							data-dominant={vert === result.dominant}
							style:--bar-delay="{i * 90}ms"
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
						</li>
					{/each}
				</ul>

				<p class="result__hint">
					Each bar is independent — the five percentages do not sum to 100. A strong introverted
					otrovert can legitimately score high on both axes.
				</p>

				<div class="result__actions">
					<button class="result__retake" type="button" onclick={handleRetake}>
						<em>Start over.</em><span class="result__retake-glyph" aria-hidden="true">↺</span>
					</button>
					<p class="result__retake-meta">
						Clears your answers on this device and rolls the page back to the top.
					</p>
				</div>
			</div>
		</section>
	{/if}

	<footer class="page-footer">
		<Tagline size={11} align="left" />
		<div class="page-footer__version">{APP_VERSION}</div>
	</footer>
</main>

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

	.submit {
		background: var(--paper-dk);
		padding: clamp(80px, 12vh, 160px) 24px;
		border-top: 1px solid var(--ink-08);
		border-bottom: 1px solid var(--ink-08);
	}

	.submit__inner {
		max-width: 720px;
		margin: 0 auto;
		text-align: center;
	}

	.submit__eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-70);
		margin: 0 0 18px;
	}

	.submit__title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(36px, 5vw, 56px);
		line-height: 1.05;
		letter-spacing: -0.02em;
		margin: 0 0 36px;
		text-wrap: balance;
	}

	.submit__title em {
		font-style: italic;
		color: var(--vert-otrovert-ink);
	}

	.submit__cta {
		display: inline-flex;
		align-items: center;
		gap: 14px;
		height: 60px;
		padding: 0 32px;
		background: var(--ink);
		color: var(--paper);
		border: none;
		border-radius: var(--button-radius);
		font-family: var(--font-sans);
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.2s ease,
			transform 0.2s ease;
	}

	.submit__cta:disabled,
	.submit__cta[aria-disabled='true'] {
		background: var(--ink-12);
		color: var(--ink-70);
		cursor: not-allowed;
		transform: none;
	}

	.submit__cta:not(:disabled):hover {
		transform: translateY(-1px);
	}

	.submit__cta:focus-visible {
		outline: 2px solid var(--paper);
		outline-offset: 3px;
		box-shadow: 0 0 0 4px var(--ink);
	}

	.submit__hint {
		margin: 24px 0 0;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.05em;
		color: var(--ink-70);
	}

	.result {
		position: relative;
		isolation: isolate;
		background: var(--paper);
		scroll-margin-top: 72px;
		overflow: hidden;
	}

	/* Mirrors `.chapter-head` layout/spacing/sticky-behavior so the result
	   page reads as the natural Chapter V continuation of the quiz. The
	   accent token is sourced from the dominant archetype (set inline). */
	.result-head {
		position: sticky;
		top: 0;
		z-index: 5;
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: clamp(12px, 2vw, 20px);
		padding: 14px clamp(16px, 4vw, 56px);
		min-height: 72px;
		background: color-mix(in oklab, var(--paper) 88%, transparent);
		backdrop-filter: blur(18px) saturate(1.05);
		-webkit-backdrop-filter: blur(18px) saturate(1.05);
		border-bottom: 1px solid var(--ink-08);
	}

	.result-head__numeral {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(28px, 3vw, 36px);
		line-height: 1;
		color: var(--accent-ink);
		min-width: 32px;
		text-align: center;
	}

	.result-head__rule {
		height: 1px;
		background: linear-gradient(to right, var(--accent), transparent 80%);
	}

	.result-head__copy {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.result-head__title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(20px, 2.4vw, 28px);
		line-height: 1;
		letter-spacing: -0.02em;
		margin: 0;
		color: var(--ink);
		white-space: nowrap;
	}

	.result-head__title em {
		font-style: italic;
	}

	.result-head__description {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(13px, 1.3vw, 15px);
		line-height: 1.35;
		color: var(--ink-70);
		margin: 0;
		text-wrap: balance;
		max-width: 64ch;
	}

	.result-head__count {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ink-70);
		white-space: nowrap;
	}

	@media (max-width: 760px) {
		.result-head__count {
			display: none;
		}
		.result-head {
			grid-template-columns: auto 1fr auto;
		}
	}

	@media (max-width: 540px) {
		.result-head__description {
			display: none;
		}
		.result-head__rule {
			display: none;
		}
		.result-head {
			grid-template-columns: auto auto 1fr;
		}
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

	.result__eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-70);
		margin: 0 0 20px;
	}

	.result__title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(48px, 8vw, 96px);
		line-height: 1;
		letter-spacing: -0.03em;
		margin: 0 0 18px;
		text-wrap: balance;
	}

	.result__title em {
		font-style: italic;
		color: var(--dominant-ink, var(--ink));
	}

	.result__lede {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(20px, 2.4vw, 26px);
		color: var(--ink);
		margin: 0 0 24px;
	}

	.result__prose {
		max-width: 56ch;
		font-size: 16px;
		line-height: 1.6;
		color: var(--ink-70);
		margin: 0 0 56px;
		text-wrap: pretty;
	}

	.result__bars {
		list-style: none;
		margin: 0 0 36px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.result__bar {
		display: grid;
		grid-template-columns: minmax(96px, 120px) 1fr auto;
		align-items: center;
		gap: 16px;
		font-family: var(--font-mono);
		font-size: 12px;
		opacity: 0;
		animation: result-bar-in 520ms cubic-bezier(0.2, 0.7, 0.3, 1) var(--bar-delay, 0ms) both;
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

	.result__hint {
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1.6;
		color: var(--ink-70);
		margin: 0;
	}

	.result__actions {
		margin-top: 56px;
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
