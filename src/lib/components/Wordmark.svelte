<script lang="ts">
	interface Props {
		size?: number;
	}

	const { size = 22 }: Props = $props();
</script>

<span
	class="font-display select-none leading-none text-[var(--ink)]"
	style:font-size="{size}px"
	style:font-weight="600"
>
	multivert<span class="text-[var(--vert-otrovert-mid)]">.</span>
</span>
