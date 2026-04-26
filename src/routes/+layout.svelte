<script lang="ts">
	import '@fontsource/newsreader/400.css';
	import '@fontsource/newsreader/500.css';
	import '@fontsource/newsreader/400-italic.css';
	import '@fontsource/newsreader/500-italic.css';
	import '@fontsource-variable/geist/index.css';
	import '@fontsource/jetbrains-mono/400.css';
	import '@fontsource/jetbrains-mono/500.css';

	import '../app.css';

	const { children } = $props();
</script>

{@render children?.()}
