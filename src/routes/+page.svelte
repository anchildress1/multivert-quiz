<script lang="ts">
	import { questions } from '$lib/questions';

	const total = questions.length;
</script>

<svelte:head>
	<title>Multivert — what vert are you?</title>
</svelte:head>

<section class="flex flex-1 flex-col items-center justify-center gap-6 text-center">
	<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Multivert</h1>
	<p class="max-w-prose text-balance text-base text-slate-600 dark:text-slate-300 sm:text-lg">
		A 5-type personality quiz that classifies you across <em>introvert</em>, <em>extrovert</em>,
		<em>ambivert</em>, <em>omnivert</em>, and <em>otrovert</em> — using a multi-axis scoring model that
		respects each type's defining feature.
	</p>
	<p class="text-sm text-slate-500 dark:text-slate-400">
		{total} questions · ~5 minutes · no account required
	</p>
</section>
