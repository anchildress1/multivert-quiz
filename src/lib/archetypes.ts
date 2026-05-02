/**
 * Canonical archetype + dimension registry. Single source of truth for type,
 * label, hue, and chapter mapping. Adding or renaming an archetype is a
 * one-file change. Scoring math lives in `scoring.ts`; PRD changes pair with
 * code changes.
 */

export const DIMENSIONS = ['extraversion', 'otherness', 'group_size', 'swings'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const ARCHETYPES = ['introvert', 'extrovert', 'ambivert', 'omnivert', 'otrovert'] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export type DimensionVector = Record<Dimension, number>;

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
export const ACCENT_ROTATION = [
	'otrovert',
	'introvert',
	'ambivert',
	'omnivert',
	'extrovert'
] as const satisfies readonly Archetype[];
