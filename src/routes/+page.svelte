<script lang="ts">
	import { browser } from '$app/environment';
	import { ACCENT_ROTATION, CHAPTERS, VERT_NAMES, VERT_ORDER, type Chapter } from '$lib/archetypes';
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

	let activeChapter = $state<Chapter | null>(null);
	let scrollY = $state(0);

	const meterVisible = $derived(scrollY > 80);

	$effect(() => {
		if (!browser) return;

		const chapterTargets = CHAPTERS.map((ch) => ({
			chapter: ch,
			el: document.getElementById(ch.id)
		})).filter((entry): entry is { chapter: Chapter; el: HTMLElement } => entry.el !== null);

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

	function scrollToFirstChapter(event: MouseEvent) {
		if (!browser || !firstChapter) return;
		event.preventDefault();
		document
			.getElementById(firstChapter.id)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function scrollToSubmit(event: MouseEvent) {
		if (!browser) return;
		event.preventDefault();
		document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function revealResult() {
		if (!browser) return;
		document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	/**
	 * Auto-advance to the next question once the user commits an answer.
	 * Skipped when:
	 *   - the user is revising (the next question is already answered, so they
	 *     are likely scrolling back to fine-tune rather than progressing), or
	 *   - the user has prefers-reduced-motion (we respect their pacing).
	 */
	/**
	 * Forward-progress lock: the user can scroll up freely to revise earlier
	 * answers but cannot scroll past the first unanswered question. If they
	 * try, snap them back to it AND bump `nudgeAt` so the row pulses to draw
	 * the user's eye to the question they need to answer.
	 */
	const firstUnansweredId = $derived.by(() => {
		const found = questions.find((q) => store.answers[q.id]?.state !== 'answered');
		return found?.id ?? null;
	});

	let nudgeTargetId = $state<string | null>(null);
	let nudgeAt = $state(0);

	$effect(() => {
		if (!browser) return;
		if (firstUnansweredId === null) return; // all answered → no lock
		const targetId = firstUnansweredId;

		let isLocking = false;
		const onScroll = () => {
			if (isLocking) return;
			const el = document.getElementById(`q-${targetId}`);
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const headerH = 72;
			// Only bounce when the user has clearly tried to scroll past — the
			// unanswered question's bottom has crossed above the sticky header.
			if (rect.bottom < headerH) {
				isLocking = true;
				const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
				el.scrollIntoView({
					behavior: reduceMotion ? 'auto' : 'smooth',
					block: 'start'
				});
				nudgeTargetId = targetId;
				nudgeAt = Date.now();
				setTimeout(() => {
					isLocking = false;
				}, 700);
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function handleAnswerCommit(qId: string) {
		if (!browser) return;
		const idx = questions.findIndex((q) => q.id === qId);
		if (idx < 0 || idx >= questions.length - 1) return;
		const next = questions[idx + 1];
		if (!next) return;
		if (store.answers[next.id]?.state === 'answered') return;
		const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';
		// Wait for the slider's commit animation to settle before scrolling.
		setTimeout(() => {
			document.getElementById(`q-${next.id}`)?.scrollIntoView({ behavior, block: 'start' });
		}, 450);
	}
</script>

<svelte:head>
	<title>Multivert — what vert are you?</title>
</svelte:head>

<svelte:window bind:scrollY />

<ProgressMeter
	total={store.total}
	answered={store.totalAnswered}
	chapter={activeChapter ? `${activeChapter.numeral} · ${activeChapter.title}` : null}
	visible={meterVisible}
/>

<header class="hero" style:font-family="var(--font-sans)">
	<div class="hero__bar">
		<Wordmark size={22} />
		<nav class="hero__nav">
			<a href="#chapter-energy" onclick={scrollToFirstChapter}>The five verts</a>
			<a href="#submit" onclick={scrollToSubmit}>Submit</a>
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
					{questions.length} questions · about 6 minutes · scroll-paced · no signup
				</p>
			</div>

			<p class="hero__hint">
				This is a single page — answers save as you scroll, and a quiet meter pins to the top once
				you start.
			</p>
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

	<div class="hero__footer">
		<Tagline size={11} align="left" />
		<div class="hero__version">{APP_VERSION}</div>
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
					nudgeAt={nudgeTargetId === q.id ? nudgeAt : 0}
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
				onclick={revealResult}
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
		<section id="result" class="result" aria-labelledby="result-title">
			<div class="result__inner">
				<p class="result__eyebrow">your result · {store.total} of {store.total} answered</p>
				<h2 id="result-title" class="result__title">
					You are an <em style:color="var(--vert-{result.dominant}-ink)"
						>{VERT_NAMES[result.dominant].name}</em
					>.
				</h2>
				<p class="result__lede">{VERT_NAMES[result.dominant].label}</p>

				<ul class="result__bars">
					{#each VERT_ORDER as vert (vert)}
						{@const fit = result.fits.find((f) => f.archetype === vert)?.fit ?? 0}
						<li class="result__bar" data-dominant={vert === result.dominant}>
							<span class="result__bar-name">{VERT_NAMES[vert].name}</span>
							<span class="result__bar-track" aria-hidden="true">
								<span
									class="result__bar-fill"
									style:width="{fit}%"
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
		color: var(--ink-50);
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

	.hero__cta-meta {
		font-size: 13px;
		color: var(--ink-50);
		margin: 0;
	}

	.hero__hint {
		margin-top: 28px;
		max-width: 540px;
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1.6;
		letter-spacing: 0.04em;
		color: var(--ink-50);
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
		color: var(--ink-50);
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
		font-size: 22px;
		letter-spacing: -0.02em;
	}

	.hero__card-label {
		font-size: 13px;
		color: var(--ink-70);
		line-height: 1.4;
	}

	.hero__footer {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding: 24px;
		border-top: 1px solid var(--ink-08);
	}

	.hero__version {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--ink-50);
	}

	@media (min-width: 960px) {
		.hero__grid {
			grid-template-columns: 1fr minmax(0, 480px);
			gap: 80px;
			padding: 96px 56px 64px;
			align-items: start;
		}
		.hero__bar {
			padding: 24px 56px;
		}
		.hero__footer {
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
		color: var(--ink-50);
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
		color: var(--ink-30);
		cursor: not-allowed;
		transform: none;
	}

	.submit__cta:not(:disabled):hover {
		transform: translateY(-1px);
	}

	.submit__hint {
		margin: 24px 0 0;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.05em;
		color: var(--ink-50);
	}

	.result {
		background: var(--paper);
		padding: clamp(64px, 10vh, 128px) clamp(16px, 4vw, 64px);
		scroll-margin-top: 72px;
	}

	.result__inner {
		max-width: 760px;
		margin: 0 auto;
	}

	.result__eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-50);
		margin: 0 0 18px;
	}

	.result__title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(40px, 6vw, 72px);
		line-height: 1.05;
		letter-spacing: -0.025em;
		margin: 0 0 16px;
		text-wrap: balance;
	}

	.result__title em {
		font-style: italic;
	}

	.result__lede {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(18px, 2.2vw, 22px);
		color: var(--ink-70);
		margin: 0 0 48px;
	}

	.result__bars {
		list-style: none;
		margin: 0 0 32px;
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
		border-radius: 999px;
		transition: width 0.4s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.result__bar-pct {
		font-variant-numeric: tabular-nums;
		color: var(--ink-50);
		min-width: 56px;
		text-align: right;
	}

	.result__hint {
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1.6;
		color: var(--ink-50);
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
		color: var(--ink-50);
	}

	@media (min-width: 960px) {
		.page-footer {
			padding: 32px 56px;
		}
	}
</style>
