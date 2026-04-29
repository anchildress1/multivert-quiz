<script lang="ts">
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
	</div>
</div>

<style>
	.meter {
		position: sticky;
		top: 0;
		z-index: 30;
		background: color-mix(in oklab, var(--paper) 88%, transparent);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-bottom: 1px solid transparent;
		transform: translateY(-100%);
		transition:
			transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1),
			border-color 0.3s ease;
	}

	.meter[data-visible='true'] {
		transform: translateY(0);
		border-bottom-color: var(--ink-08);
	}

	.meter__inner {
		max-width: 1160px;
		margin: 0 auto;
		padding: 14px 24px;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 24px;
	}

	.meter__brand {
		display: flex;
		align-items: center;
	}

	.meter__chapter {
		display: flex;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
		font-family: var(--font-mono);
		font-size: 11px;
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
		grid-template-columns: auto minmax(60px, 200px) auto;
		align-items: center;
		gap: 12px;
		font-family: var(--font-mono);
		font-size: 11px;
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
		height: 3px;
		border-radius: 999px;
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
		min-width: 36px;
		text-align: right;
	}

	@media (max-width: 720px) {
		.meter__chapter {
			display: none;
		}
		.meter__inner {
			grid-template-columns: auto 1fr;
		}
	}
</style>
