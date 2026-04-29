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
	/** Capitalised display name (`Introvert`). */
	name: string;
	/** One-line tagline used in the hero reference card and result lede. */
	label: string;
	/** 1-3 sentence prose description rendered on the result page. */
	prose: string;
}

export const VERT_NAMES: Readonly<Record<Archetype, VertMeta>> = Object.freeze({
	introvert: {
		name: 'Introvert',
		label: 'inward, charged by quiet',
		prose:
			'Recharges in quiet. Social rooms cost something to be in, and solitude is not an empty default — it is where the work of being yourself actually happens.'
	},
	extrovert: {
		name: 'Extrovert',
		label: 'outward, charged by people',
		prose:
			'Charged by people. The energy goes up in a crowded room, and a quiet weekend reads as a small debt to be paid back at the next gathering.'
	},
	ambivert: {
		name: 'Ambivert',
		label: 'context-flexible, mid-range',
		prose:
			'Reads the room and matches it. Equally at home talking and listening, equally drained by too much of either — your rhythm is the average, not the extreme.'
	},
	omnivert: {
		name: 'Omnivert',
		label: 'oscillates between extremes',
		prose:
			'Either fully on or fully off. No gentle middle gear — the same week can hold a hosted dinner and a do-not-disturb day, and both are equally you.'
	},
	otrovert: {
		name: 'Otrovert',
		label: 'belongs without belonging',
		prose:
			'A 2025 construct from psychiatrist Rami Kaminski. Comfortable in groups when there is a defined role; observer-not-member without one. You belong without belonging.'
	}
});

export interface DimensionMeta {
	/** Italic display blurb shown under each chapter title. */
	description: string;
}

export const DIMENSION_META: Readonly<Record<Dimension, DimensionMeta>> = Object.freeze({
	extraversion: {
		description:
			'How casual, unstructured social settings actually feel — the kind without a defined role.'
	},
	belonging: {
		description:
			'Whether you carry a "we" with you, or whether you watch from just outside the circle.'
	},
	group_size: {
		description:
			'Whether energy comes from one deep conversation or twenty new faces in the same hour.'
	},
	swings: {
		description: 'How dramatically the same person, same plan, same week can flip.'
	}
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
