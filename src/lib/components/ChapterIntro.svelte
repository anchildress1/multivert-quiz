<script lang="ts">
	import type { Archetype, ChapterNumeral } from '$lib/archetypes';

	interface Props {
		id: string;
		numeral: ChapterNumeral;
		title: string;
		archetype: Archetype;
		count: number;
		/**
		 * Italic blurb shown under the title — pulled from `DIMENSION_META` in
		 * the registry so chapter copy has a single source of truth.
		 */
		description: string;
		/** Suffix on the right-hand count, e.g. `7 statements` or `5 verts`. */
		countLabel?: string;
	}

	const {
		id,
		numeral,
		title,
		archetype,
		count,
		description,
		countLabel = 'statements'
	}: Props = $props();
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
	<span class="chapter-head__count">{count} {countLabel}</span>
</header>

<style>
	.chapter-head {
		position: sticky;
		top: 0;
		z-index: 5;
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: clamp(0.75rem, 2vw, 1.25rem);
		padding: 0.875rem clamp(1rem, 4vw, 3.5rem);
		min-height: var(--chapter-head-h, 4.5rem);
		background: var(--glass-bg);
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		border-bottom: var(--glass-border);
		transition: top 0.4s cubic-bezier(0.2, 0.7, 0.2, 1);
	}

	/* Stack below the progress meter when the meter is visible. The meter
	   slides in once the user has scrolled past the hero, so before that
	   the banner sits flush at top:0. The transition matches the meter's
	   own translate timing so the two bars feel like one chained motion. */
	:global(body:has(.meter[data-visible='true'])) .chapter-head {
		top: var(--meter-h, 3.5rem);
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

	.chapter-head__count {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ink-70);
		white-space: nowrap;
	}

	@media (max-width: 47.5rem) {
		.chapter-head__count {
			display: none;
		}
		.chapter-head {
			grid-template-columns: auto 1fr auto;
		}
	}

	@media (max-width: 33.75rem) {
		.chapter-head__description {
			display: none;
		}
		.chapter-head__rule {
			display: none;
		}
		.chapter-head {
			grid-template-columns: auto auto 1fr;
		}
	}
</style>
