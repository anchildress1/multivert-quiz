<script lang="ts">
	import type { Archetype, ChapterNumeral } from '$lib/archetypes';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	interface Props {
		id: string;
		numeral: ChapterNumeral;
		title: string;
		archetype: Archetype;
		description: string;
		total: number;
		answered: number;
	}

	const { id, numeral, title, archetype, description, total, answered }: Props = $props();

	const pct = $derived(
		total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((answered / total) * 100)))
	);
</script>

<header
	class="chapter-head"
	data-archetype={archetype}
	style:--accent="var(--vert-{archetype}-mid)"
	style:--accent-ink="var(--vert-{archetype}-ink)"
>
	<span class="chapter-head__numeral" aria-hidden="true">{numeral}</span>
	<div class="chapter-head__rule" aria-hidden="true"></div>
	<div class="chapter-head__copy">
		<h2 {id} class="chapter-head__title">
			<em>{title}</em>
		</h2>
		<p class="chapter-head__description">{description}</p>
	</div>
	<div
		class="chapter-head__progress"
		role="progressbar"
		aria-label="Quiz progress"
		aria-valuemin={0}
		aria-valuemax={total}
		aria-valuenow={answered}
		aria-valuetext="{answered} of {total} answered ({pct}%)"
	>
		<span class="chapter-head__progress-count" aria-hidden="true">
			<strong>{answered}</strong><span class="chapter-head__progress-total"> / {total}</span>
		</span>
		<span class="chapter-head__progress-bar" aria-hidden="true">
			<span class="chapter-head__progress-fill" style:width="{pct}%"></span>
		</span>
		<span class="chapter-head__progress-pct" aria-hidden="true">{pct}%</span>
	</div>
	<div class="chapter-head__toggle">
		<ThemeToggle />
	</div>
</header>

<style>
	.chapter-head {
		position: sticky;
		top: 0;
		z-index: 5;
		display: grid;
		grid-template-columns: auto 1fr auto auto auto;
		align-items: center;
		gap: clamp(0.75rem, 2vw, 1.25rem);
		padding: 0.875rem clamp(1rem, 4vw, 3.5rem);
		min-height: var(--chapter-head-h, 4.5rem);
		background: var(--glass-bg);
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		border-bottom: var(--glass-border);
	}

	.chapter-head__numeral {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(1.75rem, 3vw, 2.25rem);
		line-height: 1;
		color: var(--accent-ink);
		min-width: 2rem;
		text-align: center;
	}

	.chapter-head__rule {
		height: 0.0625rem;
		background: linear-gradient(to right, var(--accent), transparent 80%);
	}

	.chapter-head__copy {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.chapter-head__title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(1.25rem, 2.4vw, 1.75rem);
		line-height: 1;
		letter-spacing: -0.02em;
		margin: 0;
		color: var(--ink);
		white-space: nowrap;
	}

	.chapter-head__title em {
		font-style: italic;
	}

	.chapter-head__description {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(0.8125rem, 1.3vw, 0.9375rem);
		line-height: 1.35;
		color: var(--ink-70);
		margin: 0;
		text-wrap: balance;
		max-width: 64ch;
	}

	/* Progress block — small mono cluster on the right. Quiet enough to read
	   as a status strip on the chapter banner rather than a second bar. */
	.chapter-head__progress {
		display: grid;
		grid-template-columns: auto minmax(3.75rem, 12.5rem) auto;
		align-items: center;
		gap: 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--ink-70);
	}

	.chapter-head__progress-count strong {
		color: var(--ink);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.chapter-head__progress-total {
		color: var(--ink-70);
	}

	.chapter-head__progress-bar {
		display: block;
		height: 0.1875rem;
		border-radius: 99rem;
		background: var(--ink-08);
		overflow: hidden;
		position: relative;
	}

	.chapter-head__progress-fill {
		display: block;
		height: 100%;
		background: var(--ink);
		transition: width 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.chapter-head__progress-pct {
		font-variant-numeric: tabular-nums;
		color: var(--ink-70);
		min-width: 2.25rem;
		text-align: right;
	}

	.chapter-head__toggle {
		display: flex;
		align-items: center;
	}

	/* Medium screens: drop the long bar segment so the count + pct still
	   read at a glance, and let the title breathe. */
	@media (max-width: 60rem) {
		.chapter-head__progress {
			grid-template-columns: auto auto;
			gap: 0.5rem;
		}
		.chapter-head__progress-bar {
			display: none;
		}
	}

	/* Narrow screens: drop the description and the gradient rule. Keeps the
	   numeral + title + a hairline progress count + theme toggle. */
	@media (max-width: 47.5rem) {
		.chapter-head__description {
			display: none;
		}
		.chapter-head__rule {
			display: none;
		}
		.chapter-head {
			grid-template-columns: auto 1fr auto auto;
			gap: 0.875rem;
		}
		.chapter-head__progress-count {
			display: none;
		}
	}
</style>
