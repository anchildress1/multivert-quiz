<script lang="ts">
	import '../app.css';

	const { children } = $props();
</script>

<main class="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-8 sm:px-6">
	{@render children?.()}
</main>
