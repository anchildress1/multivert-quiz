<script lang="ts">
	import { resolve } from '$app/paths';
	import Wordmark from '$lib/components/Wordmark.svelte';
</script>

<svelte:head>
	<title>Multivert — quiz (coming soon)</title>
</svelte:head>

<main
	class="bg-[var(--paper)] text-[var(--ink)] mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center"
>
	<Wordmark size={28} />
	<h1 class="font-display text-balance text-[40px] leading-tight" style:font-weight="400">
		The quiz lands in the next PR.
	</h1>
	<p class="max-w-prose text-[15px] leading-[1.55] text-[var(--ink-70)]">
		The Slider primitive, the 30-question scrolling flow, and the full submission state all live on
		a follow-up branch. For now, this stub keeps the landing-page CTA navigable.
	</p>
	<a
		href={resolve('/')}
		class="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-50)] hover:text-[var(--ink)]"
	>
		← back to landing
	</a>
</main>
