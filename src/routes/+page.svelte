<script lang="ts">
	import { resolve } from '$app/paths';
	import FiveDots from '$lib/components/FiveDots.svelte';
	import Tagline from '$lib/components/Tagline.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import { questions } from '$lib/questions';
	import { VERT_NAMES, VERT_ORDER } from '$lib/types';

	const total = questions.length;
</script>

<svelte:head>
	<title>Multivert — what vert are you?</title>
</svelte:head>

<div
	class="bg-[var(--paper)] text-[var(--ink)] flex min-h-dvh flex-col"
	style:font-family="var(--font-sans)"
>
	<header
		class="flex items-center justify-between border-b border-[var(--ink-08)] px-6 py-5 sm:px-14 sm:py-6"
	>
		<Wordmark size={22} />
		<nav class="hidden items-center gap-8 text-[13px] text-[var(--ink-70)] md:flex">
			<a href="#five-verts" class="hover:text-[var(--ink)]">The five verts</a>
			<a href="#method" class="hover:text-[var(--ink)]">Method</a>
			<a href="#citations" class="hover:text-[var(--ink)]">Citations</a>
			<FiveDots />
		</nav>
		<div class="md:hidden">
			<FiveDots />
		</div>
	</header>

	<main class="flex flex-1 flex-col px-6 pb-12 pt-14 sm:px-14 md:pt-22">
		<div class="mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1fr_minmax(0,480px)] md:gap-16">
			<div>
				<div class="eyebrow mb-7 flex items-center gap-3 text-[11px]" style:letter-spacing="0.2em">
					<span class="block h-px w-6 bg-[var(--ink-30)]"></span>
					A personality quiz, properly five-sided
				</div>

				<h1
					class="font-display m-0 text-balance text-[56px] leading-[0.96] sm:text-[88px] md:text-[116px] md:leading-[0.92]"
					style:letter-spacing="-0.035em"
					style:font-weight="400"
				>
					Which of the
					<em class="font-display-italic" style:color="var(--vert-otrovert-ink)">
						five&nbsp;verts</em
					>
					are&nbsp;you?
				</h1>

				<p
					class="mt-9 max-w-[540px] text-[15px] leading-[1.55] text-[var(--ink-70)] sm:text-[17px] md:text-[18px]"
				>
					Most quizzes only know two: introvert, extrovert. We added three more —
					<em>ambivert</em> (context-flexible),
					<em>omnivert</em> (oscillates between extremes), and
					<em>otrovert</em> (a 2025 construct from psychiatrist Rami Kaminski; belongs without
					belonging). {total} statements, one quiet slider, a five-way breakdown at the end.
				</p>

				<div class="mt-12 flex flex-wrap items-center gap-4">
					<a
						href={resolve('/quiz')}
						class="inline-flex h-[60px] items-center gap-3.5 px-7 text-[16px] font-medium tracking-tight transition hover:opacity-90"
						style:background="var(--ink)"
						style:color="var(--paper)"
						style:border-radius="var(--button-radius)"
					>
						Start the quiz
						<span class="opacity-60">→</span>
					</a>
					<div class="text-[13px] text-[var(--ink-50)]">
						{total} questions · about 6 minutes · no signup
					</div>
				</div>
			</div>

			<aside
				id="five-verts"
				class="border border-[var(--ink-08)] p-8"
				style:background="var(--paper-dk)"
				style:border-radius="var(--card-radius)"
			>
				<div class="eyebrow mb-5">The five verts</div>
				<ul class="flex flex-col">
					{#each VERT_ORDER as vert, i (vert)}
						<li
							class="grid items-center gap-3.5 py-3.5"
							class:border-t={i > 0}
							style:grid-template-columns="14px 110px 1fr"
							style:border-color="var(--ink-12)"
						>
							<span class="block h-2.5 w-2.5 rounded-full" style:background="var(--vert-{vert}-mid)"
							></span>
							<span
								class="font-display text-[24px] leading-tight"
								style:font-weight="400"
								style:letter-spacing="-0.02em"
							>
								{VERT_NAMES[vert].name}
							</span>
							<span class="text-[13px] leading-snug text-[var(--ink-70)]">
								{VERT_NAMES[vert].label}
							</span>
						</li>
					{/each}
				</ul>
			</aside>
		</div>
	</main>

	<footer class="flex items-end justify-between border-t border-[var(--ink-08)] px-6 py-7 sm:px-14">
		<Tagline size={11} align="left" />
		<div class="font-mono text-[10px] text-[var(--ink-50)]">v0.1 · proof of concept</div>
	</footer>
</div>
