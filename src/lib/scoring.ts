/**
 * Multivert — Scoring Engine
 *
 * Deterministic scoring per the locked specification in docs/PRD.md. AI must
 * never enter the scoring path; AI is permitted only to colour result-paragraph
 * tone elsewhere. Any change to the weight matrix or ideal vectors must be
 * paired with a PRD revision.
 *
 * Pipeline:
 *   1. Apply reverse-score sign-flip to flagged items.
 *   2. Compute per-dimension means.
 *   3. Compute the variance of the (sign-flipped) extraversion items and add
 *      it to the swings dimension as a derived signal — a high variance
 *      across the extraversion axis is a legitimate omnivert tell that
 *      doesn't consume question slots.
 *   4. For each archetype, compute the weighted Euclidean distance between
 *      the user dimension vector and the archetype's ideal vector.
 *   5. Map distance → 0–100% fit per archetype on its own scale (NOT
 *      cross-normalized; archetypes can co-score high).
 *   6. Headline = the archetype with the highest fit %.
 */

import {
	ARCHETYPES,
	ARCHETYPE_IDEALS,
	ARCHETYPE_WEIGHTS,
	DIMENSIONS,
	type Archetype,
	type Dimension,
	type DimensionVector
} from './archetypes';

export {
	ARCHETYPES,
	ARCHETYPE_IDEALS,
	ARCHETYPE_WEIGHTS,
	DIMENSIONS,
	type Archetype,
	type Dimension,
	type DimensionVector
};

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

/** Maximum possible weighted Euclidean distance for any user vs. ideal pair. */
const MAX_DISTANCE = 2;

const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value));

const mean = (values: readonly number[]): number => {
	/* v8 ignore next — guarded upstream by computeDimensions */
	if (values.length === 0) return 0;
	let sum = 0;
	for (const v of values) sum += v;
	return sum / values.length;
};

const variance = (values: readonly number[]): number => {
	/* v8 ignore next — guarded upstream by computeDimensions */
	if (values.length === 0) return 0;
	const mu = mean(values);
	let acc = 0;
	for (const v of values) acc += (v - mu) ** 2;
	return acc / values.length;
};

/** Apply reverse-score sign-flip and clamp to [-1, 1]. */
const normalize = (item: AnsweredItem): number =>
	clampUnit(item.reverse ? -item.value : item.value);

/**
 * Compute the four-dimensional user vector from the answered question bank.
 * Throws if any P0 dimension is missing — partial submissions are not scored.
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

	const swingsBase = mean(buckets.swings);
	const extraversionVariance = variance(buckets.extraversion);
	// Variance ∈ [0, 1] given inputs ∈ [-1, 1]; bias toward the swings pole.
	const swingsAdjusted = clampUnit(swingsBase + extraversionVariance);

	return {
		extraversion: mean(buckets.extraversion),
		belonging: mean(buckets.belonging),
		group_size: mean(buckets.group_size),
		swings: swingsAdjusted
	};
};

/** Weighted Euclidean distance between user vector and archetype ideal. */
export const weightedDistance = (
	user: DimensionVector,
	ideal: DimensionVector,
	weights: DimensionVector
): number => {
	let acc = 0;
	for (const dim of DIMENSIONS) {
		const diff = user[dim] - ideal[dim];
		acc += weights[dim] * diff * diff;
	}
	return Math.sqrt(acc);
};

/** Map a weighted distance to a 0–100% fit score (higher = closer match). */
export const distanceToFit = (distance: number): number => {
	const clamped = Math.max(0, Math.min(MAX_DISTANCE, distance));
	return ((MAX_DISTANCE - clamped) / MAX_DISTANCE) * 100;
};

/** End-to-end scoring entry point. */
export const scoreQuiz = (items: readonly AnsweredItem[]): QuizResult => {
	const dimensions = computeDimensions(items);

	const fits: ArchetypeFit[] = ARCHETYPES.map((archetype) => ({
		archetype,
		fit: distanceToFit(
			weightedDistance(dimensions, ARCHETYPE_IDEALS[archetype], ARCHETYPE_WEIGHTS[archetype])
		)
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
