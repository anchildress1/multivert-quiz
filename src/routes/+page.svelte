<script lang="ts">
	import { browser } from '$app/environment';
	import ChapterIntro from '$lib/components/ChapterIntro.svelte';
	import FiveDots from '$lib/components/FiveDots.svelte';
	import ProgressMeter from '$lib/components/ProgressMeter.svelte';
	import QuestionRow from '$lib/components/QuestionRow.svelte';
	import Tagline from '$lib/components/Tagline.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import { questions } from '$lib/questions';
	import type { Archetype, Dimension } from '$lib/scoring';
	import { createAnswersStore, questionsByDimension } from '$lib/state/answers.svelte';
	import { VERT_NAMES, VERT_ORDER } from '$lib/types';

	const store = createAnswersStore();
	const grouped = questionsByDimension();

	const accentRotation: readonly Archetype[] = [
		'otrovert',
		'introvert',
		'ambivert',
		'omnivert',
		'extrovert'
	];

	interface Chapter {
		id: string;
		dimension: Dimension;
		numeral: 'I' | 'II' | 'III' | 'IV';
		title: string;
		dek: string;
		archetype: Archetype;
		dimensionLabel: string;
	}

	const chapters: Chapter[] = [
		{
			id: 'chapter-energy',
			dimension: 'extraversion',
			numeral: 'I',
			title: 'Energy',
			dek: 'Where you charge from. Inward, outward, or somewhere on the dial between them.',
			archetype: 'introvert',
			dimensionLabel: 'extraversion'
		},
		{
			id: 'chapter-belonging',
			dimension: 'belonging',
			numeral: 'II',
			title: 'Belonging',
			dek: 'How you fit into groups — or how you don’t. The newcomer dimension lives here.',
			archetype: 'otrovert',
			dimensionLabel: 'belonging'
		},
		{
			id: 'chapter-crowds',
			dimension: 'group_size',
			numeral: 'III',
			title: 'Crowds',
			dek: 'Big rooms, small rooms. Five quick reads on the size you’d pick.',
			archetype: 'extrovert',
			dimensionLabel: 'group size'
		},
		{
			id: 'chapter-swings',
			dimension: 'swings',
			numeral: 'IV',
			title: 'Swings',
			dek: 'Steady waters or shifting tides. The variance signal lives here.',
			archetype: 'omnivert',
			dimensionLabel: 'situational variance'
		}
	];

	let activeChapter = $state<Chapter | null>(null);
	let scrollY = $state(0);

	const meterVisible = $derived(scrollY > 80);

	$effect(() => {
		if (!browser) return;

		const chapterTargets = chapters
			.map((ch) => ({ chapter: ch, el: document.getElementById(ch.id) }))
			.filter((entry): entry is { chapter: Chapter; el: HTMLElement } => entry.el !== null);

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

	function scrollToFirstChapter(event: MouseEvent) {
		if (!browser) return;
		event.preventDefault();
		const first = document.getElementById(chapters[0]!.id);
		first?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function scrollToSubmit(event: MouseEvent) {
		if (!browser) return;
		event.preventDefault();
		document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
		<div class="hero__version">v0.1 · proof of concept</div>
	</div>
</header>

<main class="quiz">
	{#each chapters as chapter, ci (chapter.id)}
		<ChapterIntro
			id={chapter.id}
			numeral={chapter.numeral}
			title={chapter.title}
			dek={chapter.dek}
			archetype={chapter.archetype}
			count={grouped[chapter.dimension].length}
			dimension={chapter.dimensionLabel}
		/>

		<section class="quiz__chapter" aria-labelledby="{chapter.id}-heading" data-chapter={chapter.id}>
			<h3 id="{chapter.id}-heading" class="quiz__sr-only">
				Questions on {chapter.dimensionLabel}
			</h3>
			{#each grouped[chapter.dimension] as q, qi (q.id)}
				{@const globalIndex =
					chapters.slice(0, ci).reduce((sum, c) => sum + grouped[c.dimension].length, 0) + qi}
				{@const accent = accentRotation[globalIndex % accentRotation.length]!}
				{@const entry = store.answers[q.id] ?? { value: null, state: 'unset' }}
				<QuestionRow
					question={q}
					index={globalIndex}
					total={store.total}
					{accent}
					value={entry.value}
					state={entry.state}
					onchange={(next) => store.setAnswer(q.id, next)}
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

	<footer class="page-footer">
		<Tagline size={11} align="left" />
		<div class="page-footer__version">v0.1 · proof of concept</div>
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

	.quiz__chapter {
		padding: 24px 0 64px;
	}

	.quiz__sr-only {
		position: absolute;
		clip: rect(1px, 1px, 1px, 1px);
		clip-path: inset(50%);
		width: 1px;
		height: 1px;
		overflow: hidden;
		white-space: nowrap;
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
