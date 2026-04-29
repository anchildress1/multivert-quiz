/**
 * Multivert — Scoring Engine
 *
 * Deterministic per-archetype axis projection. AI must never enter the
 * scoring path; AI is permitted only to colour result-paragraph tone
 * elsewhere. Any change to the scoring rules below must be paired with a
 * PRD revision.
 *
 * Model
 * -----
 * Each archetype scores against a small subset of axes, not the full 5-d
 * vector:
 *
 *   - Introvert / Ambivert / Extrovert live on the *extraversion* axis at
 *     -1, 0, +1. A user vector is projected onto each of those three points
 *     linearly. Group-size is a secondary correlate (small ↔ large mirrors
 *     intro ↔ extro).
 *   - Otrovert is a one-sided projection along the *belonging* axis (toward
 *     -1 = "high otherness"). Independent of every other axis: an otrovert
 *     can also be intro / extro / ambi.
 *   - Omnivert is driven by explicit positive swings answers (self-reported
 *     oscillation across time / situation). Neutral or negative swings are
 *     treated as absence of omnivert evidence on this one-sided axis.
 *
 * Pipeline
 * --------
 *   1. Apply reverse-score sign-flip to flagged items, clamp to [-1, 1].
 *   2. Compute per-dimension means for the four question dimensions.
 *   3. Project per-archetype per the formulas below; clamp each to [0, 1]
 *      and scale to a 0–100% fit score.
 *   4. Headline = the archetype with the highest fit %.
 *
 * Properties
 * ----------
 *   - All-zeros user vector → 100% Ambivert, 50% Introvert, 50% Extrovert,
 *     0% Otrovert, 0% Omnivert. The 50% scores reflect midpoints on a
 *     two-poled axis (Intro ↔ Extro share the extraversion line). The 0%
 *     scores reflect one-sided axes (no evidence yet of otherness or
 *     contradiction).
 *   - Each archetype's max-typed answer pattern → 100% on that archetype.
 *   - Bars are independent (no softmax / cross-normalization). Co-scoring
 *     is preserved: an introverted otrovert legitimately scores high on
 *     both because they live on different axes.
 */

import {
	ARCHETYPES,
	DIMENSIONS,
	type Archetype,
	type Dimension,
	type DimensionVector
} from './archetypes';

export {
	ARCHETYPES,
	DIMENSIONS,
	type Archetype,
	type Dimension,
	type DimensionVector
} from './archetypes';

export interface AnsweredItem {
	dimension: Dimension;
	value: number;
	reverse: boolean;
}

export interface ArchetypeFit {
	archetype: Archetype;
	fit: number;
}

export interface QuizResult {
	dimensions: DimensionVector;
	fits: ArchetypeFit[];
	dominant: Archetype;
}

/**
 * Tunable mix constants. Locked in PRD §P0.
 * EXTRA_PRIMARY_WEIGHT applies to the extraversion-axis projection for
 * intro / extro / ambi; the remaining 1 - EXTRA_PRIMARY_WEIGHT goes to the
 * group-size correlate. They must sum to 1.
 */
export const EXTRA_PRIMARY_WEIGHT = 0.7;
export const SIZE_SECONDARY_WEIGHT = 1 - EXTRA_PRIMARY_WEIGHT;

const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value));
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const mean = (values: readonly number[]): number => {
	/* v8 ignore next — guarded upstream by computeDimensions */
	if (values.length === 0) return 0;
	let sum = 0;
	for (const v of values) sum += v;
	return sum / values.length;
};

/** Apply reverse-score sign-flip and clamp to [-1, 1]. */
const normalize = (item: AnsweredItem): number =>
	clampUnit(item.reverse ? -item.value : item.value);

/**
 * Compute the four-dimension user vector from the answered question bank.
 * Throws if any of the four question dimensions is missing — partial
 * submissions are not scored.
 */
export const computeDimensions = (items: readonly AnsweredItem[]): DimensionVector => {
	const buckets: Record<Dimension, number[]> = {
		extraversion: [],
		belonging: [],
		group_size: [],
		swings: []
	};

	for (const item of items) {
		buckets[item.dimension].push(normalize(item));
	}

	for (const dim of DIMENSIONS) {
		if (buckets[dim].length === 0) {
			throw new Error(`Missing answers for dimension: ${dim}`);
		}
	}

	return {
		extraversion: mean(buckets.extraversion),
		belonging: mean(buckets.belonging),
		group_size: mean(buckets.group_size),
		swings: mean(buckets.swings)
	};
};

/**
 * Per-archetype fit, in [0, 100]. Independent of every other archetype's
 * score — bars do not cross-normalize.
 */
export const archetypeFit = (user: DimensionVector, archetype: Archetype): number => {
	switch (archetype) {
		case 'introvert': {
			const extraPole = (1 - user.extraversion) / 2;
			const sizePole = (1 - user.group_size) / 2;
			const raw = EXTRA_PRIMARY_WEIGHT * extraPole + SIZE_SECONDARY_WEIGHT * sizePole;
			return clamp01(raw) * 100;
		}
		case 'extrovert': {
			const extraPole = (1 + user.extraversion) / 2;
			const sizePole = (1 + user.group_size) / 2;
			const raw = EXTRA_PRIMARY_WEIGHT * extraPole + SIZE_SECONDARY_WEIGHT * sizePole;
			return clamp01(raw) * 100;
		}
		case 'ambivert': {
			const extraCentre = 1 - Math.abs(user.extraversion);
			const sizeCentre = 1 - Math.abs(user.group_size);
			const raw = EXTRA_PRIMARY_WEIGHT * extraCentre + SIZE_SECONDARY_WEIGHT * sizeCentre;
			return clamp01(raw) * 100;
		}
		case 'otrovert': {
			// One-sided ramp: only negative belonging produces non-zero otrovert.
			// belong = +1 (full group identification) → 0%; belong = 0 (no
			// otherness signal) → 0%; belong = -1 (full otherness) → 100%.
			// There is no opposite-named archetype on this axis, so a neutral
			// belonging answer is "absence of otrovert evidence," not "halfway
			// to otrovert."
			return clamp01(-user.belonging) * 100;
		}
		case 'omnivert': {
			// One-sided ramp: only positive swings produce non-zero omnivert.
			// In a one-shot quiz, these items directly ask about time/situation
			// oscillation; cross-item extraversion disagreement is not treated as
			// state variability.
			return clamp01(user.swings) * 100;
		}
	}
};

/** End-to-end scoring entry point. */
export const scoreQuiz = (items: readonly AnsweredItem[]): QuizResult => {
	const dimensions = computeDimensions(items);

	const fits: ArchetypeFit[] = ARCHETYPES.map((archetype) => ({
		archetype,
		fit: archetypeFit(dimensions, archetype)
	}));

	const [head, ...rest] = fits;
	/* v8 ignore next — ARCHETYPES is a 5-element const tuple, so head is always defined */
	if (!head) throw new Error('scoreQuiz produced no archetype fits');
	const dominant = rest.reduce(
		(best, current) => (current.fit > best.fit ? current : best),
		head
	).archetype;

	return { dimensions, fits, dominant };
};
