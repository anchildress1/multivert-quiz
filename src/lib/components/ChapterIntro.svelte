<script lang="ts">
	import type { Archetype } from '$lib/scoring';

	interface Props {
		id: string;
		numeral: 'I' | 'II' | 'III' | 'IV';
		title: string;
		archetype: Archetype;
		count: number;
		/**
		 * Italic blurb shown under the title — pulled from `DIMENSION_META` in
		 * the registry so chapter copy has a single source of truth.
		 */
		description: string;
	}

	const { id, numeral, title, archetype, count, description }: Props = $props();
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
	<span class="chapter-head__count">{count} statements</span>
</header>

<style>
	.chapter-head {
		position: sticky;
		top: 0;
		z-index: 5;
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: clamp(12px, 2vw, 20px);
		padding: 14px clamp(16px, 4vw, 56px);
		min-height: 72px;
		background: color-mix(in oklab, var(--paper) 88%, transparent);
		backdrop-filter: blur(18px) saturate(1.05);
		-webkit-backdrop-filter: blur(18px) saturate(1.05);
		border-bottom: 1px solid var(--ink-08);
	}

	.chapter-head__numeral {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(28px, 3vw, 36px);
		line-height: 1;
		color: var(--accent-ink);
		min-width: 32px;
		text-align: center;
	}

	.chapter-head__rule {
		height: 1px;
		background: linear-gradient(to right, var(--accent), transparent 80%);
	}

	.chapter-head__copy {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.chapter-head__title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(20px, 2.4vw, 28px);
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
		font-size: clamp(13px, 1.3vw, 15px);
		line-height: 1.35;
		color: var(--ink-70);
		margin: 0;
		text-wrap: balance;
		max-width: 64ch;
	}

	.chapter-head__count {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ink-70);
		white-space: nowrap;
	}

	@media (max-width: 760px) {
		.chapter-head__count {
			display: none;
		}
		.chapter-head {
			grid-template-columns: auto 1fr auto;
		}
	}

	@media (max-width: 540px) {
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
