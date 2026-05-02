<script lang="ts">
	import { ARCHETYPES, type Archetype } from '$lib/archetypes';

	interface Props {
		size?: number;
		gap?: number;
		active?: Archetype | null;
		dim?: number;
	}

	const { size = 6, gap = 5, active = null, dim = 0.35 }: Props = $props();
</script>

<span class="inline-flex items-center" style:gap="{gap}px" aria-hidden="true">
	{#each ARCHETYPES as vert (vert)}
		<span
			class="rounded-full"
			style:width="{size}px"
			style:height="{size}px"
			style:background="var(--vert-{vert}-mid)"
			style:opacity={active === null ? 1 : vert === active ? 1 : dim}
		></span>
	{/each}
</span>
