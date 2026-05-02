/**
 * Canonical archetype + dimension registry.
 *
 * Every list, type, label, hue, and chapter mapping that varies by archetype
 * lives here so adding or renaming an archetype is a one-file change. Other
 * modules (scoring, components, routes) import from this file directly or via
 * the convenience re-exports in `scoring.ts`.
 *
 * Scoring model
 * -------------
 * Per-archetype axis projection (no shared distance metric). Each archetype
 * scores against a small subset of axes that define it:
 *
 *   - Introvert / Ambivert / Extrovert — three points on the *extraversion*
 *     axis at -1, 0, +1. Group-size acts as a secondary correlate (introverts
 *     usually prefer small, extroverts large).
 *   - Otrovert — projection along the *otherness* axis (toward +1 = "high
 *     otherness"). Independent of the extraversion line; an otrovert can
 *     also be intro / extro / ambi.
 *   - Omnivert — driven by explicit positive answers on the swings items
 *     (self-reported oscillation across time / situation).
 *
 * The math itself lives in `scoring.ts`. PRD changes pair with code changes.
 */

export type Dimension = 'extraversion' | 'otherness' | 'group_size' | 'swings';

export type Archetype = 'introvert' | 'extrovert' | 'ambivert' | 'omnivert' | 'otrovert';

export type DimensionVector = Record<Dimension, number>;

/** Stable iteration order for question-level loops (chapters, counters). */
export const DIMENSIONS: readonly Dimension[] = [
	'extraversion',
	'otherness',
	'group_size',
	'swings'
];

/** Stable iteration order for every archetype-keyed loop and the rotating accent. */
export const ARCHETYPES: readonly Archetype[] = [
	'introvert',
	'extrovert',
	'ambivert',
	'omnivert',
	'otrovert'
];

export interface VertMeta {
	/** Capitalised display name (`Introvert`). */
	name: string;
	/** One-line tagline used in the hero reference card and result lede. */
	label: string;
}

export const VERT_NAMES: Readonly<Record<Archetype, VertMeta>> = Object.freeze({
	introvert: { name: 'Introvert', label: 'inward, charged by quiet' },
	extrovert: { name: 'Extrovert', label: 'outward, charged by people' },
	ambivert: { name: 'Ambivert', label: 'the dial, not a default' },
	omnivert: { name: 'Omnivert', label: 'oscillates between extremes' },
	otrovert: { name: 'Otrovert', label: 'belongs without belonging' }
});

export interface DimensionMeta {
	/** Italic display blurb shown under each chapter title. */
	description: string;
}

export const DIMENSION_META: Readonly<Record<Dimension, DimensionMeta>> = Object.freeze({
	extraversion: {
		description:
			'How casual, unstructured social settings actually feel—the kind without a defined role.'
	},
	otherness: {
		description:
			'Whether you carry a "we" with you, or whether you watch from just outside the circle.'
	},
	group_size: {
		description: 'Whether one deep conversation refills you, or twenty new faces in the same hour.'
	},
	swings: {
		description: 'How dramatically the same person, same plan, same week can flip.'
	}
});

/** Display order in the hero card and FiveDots. */
export const VERT_ORDER: readonly Archetype[] = ARCHETYPES;

export type ChapterNumeral = 'I' | 'II' | 'III' | 'IV' | 'V';

export interface Chapter {
	id: string;
	dimension: Dimension;
	numeral: ChapterNumeral;
	title: string;
	archetype: Archetype;
}

/** Editorial chapter order: dimension → display title → tinted with one archetype's hue. */
export const CHAPTERS: readonly Chapter[] = Object.freeze([
	{
		id: 'chapter-energy',
		dimension: 'extraversion',
		numeral: 'I',
		title: 'Energy',
		archetype: 'introvert'
	},
	{
		id: 'chapter-belonging',
		dimension: 'otherness',
		numeral: 'II',
		title: 'Belonging',
		archetype: 'otrovert'
	},
	{
		id: 'chapter-crowds',
		dimension: 'group_size',
		numeral: 'III',
		title: 'Crowds',
		archetype: 'extrovert'
	},
	{
		id: 'chapter-swings',
		dimension: 'swings',
		numeral: 'IV',
		title: 'Swings',
		archetype: 'omnivert'
	}
]);

/** Rotation used on QuestionRow accents so adjacent questions read different. */
export const ACCENT_ROTATION: readonly Archetype[] = [
	'otrovert',
	'introvert',
	'ambivert',
	'omnivert',
	'extrovert'
];
