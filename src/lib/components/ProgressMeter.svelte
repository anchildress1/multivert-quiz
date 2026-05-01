<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';

	interface Props {
		total: number;
		answered: number;
		chapter: string | null;
		visible: boolean;
	}

	const { total, answered, chapter, visible }: Props = $props();

	const pct = $derived(total === 0 ? 0 : Math.round((answered / total) * 100));
</script>

<div class="meter" data-visible={visible}>
	<div class="meter__inner">
		<div class="meter__brand">
			<Wordmark size={16} />
		</div>
		<div class="meter__chapter">
			{#if chapter}
				<span class="meter__chapter-label">in</span>
				<span class="meter__chapter-name">{chapter}</span>
			{:else}
				<span class="meter__chapter-name meter__chapter-name--quiet">begin scrolling</span>
			{/if}
		</div>
		<div
			class="meter__progress"
			role="progressbar"
			aria-label="Quiz progress"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={answered}
			aria-valuetext="{answered} of {total} answered ({pct}%)"
		>
			<span class="meter__count" aria-hidden="true">
				<strong>{answered}</strong>
				<span class="meter__total"> / {total}</span>
			</span>
			<span class="meter__bar" aria-hidden="true">
				<span class="meter__fill" style:width="{pct}%"></span>
			</span>
			<span class="meter__pct" aria-hidden="true">{pct}%</span>
		</div>
		<div class="meter__toggle">
			<ThemeToggle />
		</div>
	</div>
</div>

<style>
	.meter {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 30;
		background: var(--glass-bg);
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		border-bottom: 0.0625rem solid transparent;
		transform: translateY(-100%);
		transition:
			transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1),
			border-color 0.3s ease;
	}

	.meter[data-visible='true'] {
		transform: translateY(0);
		border-bottom-color: color-mix(in oklab, var(--ink) 8%, transparent);
	}

	.meter__inner {
		/* No max-width here — the chapter banner spans the full viewport, so
		   capping the meter's inner width to 72.5rem made the meter look
		   "pushed inward" relative to the chapter banner sitting just
		   beneath it. Both bars now use the same horizontal clamp, so the
		   wordmark left-aligns with the chapter numeral. */
		padding: 0.875rem clamp(1rem, 4vw, 3.5rem);
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: clamp(1rem, 2vw, 1.5rem);
	}

	.meter__toggle {
		display: flex;
		align-items: center;
	}

	.meter__brand {
		display: flex;
		align-items: center;
	}

	.meter__chapter {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ink-70);
		overflow: hidden;
	}

	.meter__chapter-label {
		color: var(--ink-70);
	}

	.meter__chapter-name {
		color: var(--ink);
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.meter__chapter-name--quiet {
		color: var(--ink-70);
	}

	.meter__progress {
		display: grid;
		grid-template-columns: auto minmax(3.75rem, 12.5rem) auto;
		align-items: center;
		gap: 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--ink-70);
	}

	.meter__count strong {
		color: var(--ink);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.meter__total {
		color: var(--ink-70);
	}

	.meter__bar {
		display: block;
		height: 0.1875rem;
		border-radius: 99rem;
		background: var(--ink-08);
		overflow: hidden;
		position: relative;
	}

	.meter__fill {
		display: block;
		height: 100%;
		background: var(--ink);
		transition: width 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.meter__pct {
		font-variant-numeric: tabular-nums;
		color: var(--ink-70);
		min-width: 2.25rem;
		text-align: right;
	}

	/* Narrow screens: drop the brand (the user just scrolled past it in the
	   hero) and keep the chapter context, which is the actual wayfinding. */
	@media (max-width: 45rem) {
		.meter__brand {
			display: none;
		}
		.meter__inner {
			grid-template-columns: minmax(0, 1fr) auto auto;
			gap: 1rem;
		}
	}
</style>
