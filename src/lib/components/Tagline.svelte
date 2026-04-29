<script lang="ts">
	interface Props {
		size?: number;
		align?: 'left' | 'center' | 'right';
		maxWidth?: number;
	}

	const { size = 11, align = 'center', maxWidth }: Props = $props();
</script>

<p
	class="font-mono text-[var(--ink-70)]"
	style:font-size="{size}px"
	style:line-height="1.55"
	style:letter-spacing="0.01em"
	style:text-align={align}
	style:max-width={maxWidth ? `${maxWidth}px` : undefined}
>
	Built with vibes, AI, and a small pile of cited research.<br />
	Not a diagnosis. Don't put it on your résumé.
</p>
