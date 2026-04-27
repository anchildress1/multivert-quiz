/**
 * Canonical archetype + dimension registry.
 *
 * Every list, type, vector, label, hue, and chapter mapping that varies by
 * archetype lives here so adding or renaming an archetype is a one-file
 * change. Other modules (scoring, components, routes) import from this file
 * directly or via the convenience re-exports in `scoring.ts` and `types.ts`.
 *
 * The locked weight matrix and ideal vectors are spec'd in docs/PRD.md and
 * must not be changed without a PRD revision.
 */

export type Dimension = 'extraversion' | 'belonging' | 'group_size' | 'swings';

export type Archetype = 'introvert' | 'extrovert' | 'ambivert' | 'omnivert' | 'otrovert';

export type DimensionVector = Record<Dimension, number>;

/** Stable iteration order for every dimension-keyed loop. */
export const DIMENSIONS: readonly Dimension[] = [
	'extraversion',
	'belonging',
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
	name: string;
	label: string;
}

export const VERT_NAMES: Readonly<Record<Archetype, VertMeta>> = Object.freeze({
	introvert: { name: 'Introvert', label: 'inward, charged by quiet' },
	extrovert: { name: 'Extrovert', label: 'outward, charged by people' },
	ambivert: { name: 'Ambivert', label: 'context-flexible, mid-range' },
	omnivert: { name: 'Omnivert', label: 'oscillates between extremes' },
	otrovert: { name: 'Otrovert', label: 'belongs without belonging' }
});

/** Display order in the hero card and FiveDots. */
export const VERT_ORDER: readonly Archetype[] = ARCHETYPES;

/** Locked archetype weight matrix (rows sum to 1). PRD §P0. */
export const ARCHETYPE_WEIGHTS: Readonly<Record<Archetype, DimensionVector>> = Object.freeze({
	extrovert: { extraversion: 0.5, belonging: 0.2, group_size: 0.2, swings: 0.1 },
	introvert: { extraversion: 0.5, belonging: 0.2, group_size: 0.2, swings: 0.1 },
	ambivert: { extraversion: 0.55, belonging: 0.15, group_size: 0.2, swings: 0.1 },
	otrovert: { extraversion: 0.1, belonging: 0.6, group_size: 0.2, swings: 0.1 },
	omnivert: { extraversion: 0.05, belonging: 0.05, group_size: 0.05, swings: 0.85 }
});

/** Locked archetype ideal vectors (each dimension ∈ [-1, 1]). PRD §P0. */
export const ARCHETYPE_IDEALS: Readonly<Record<Archetype, DimensionVector>> = Object.freeze({
	extrovert: { extraversion: 0.7, belonging: 0.5, group_size: 0.7, swings: -0.5 },
	introvert: { extraversion: -0.7, belonging: 0.5, group_size: -0.7, swings: -0.5 },
	ambivert: { extraversion: 0, belonging: 0.5, group_size: 0, swings: -0.5 },
	otrovert: { extraversion: 0, belonging: -0.7, group_size: -0.5, swings: -0.5 },
	omnivert: { extraversion: 0, belonging: 0, group_size: 0, swings: 0.8 }
});

export type ChapterNumeral = 'I' | 'II' | 'III' | 'IV';

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
		dimension: 'belonging',
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
