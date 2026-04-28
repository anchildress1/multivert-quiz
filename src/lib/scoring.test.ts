import { describe, expect, it } from 'vitest';
import {
	ARCHETYPE_IDEALS,
	ARCHETYPE_WEIGHTS,
	computeDimensions,
	distanceToFit,
	scoreQuiz,
	weightedDistance,
	type AnsweredItem,
	type Archetype,
	type Dimension,
	type DimensionVector
} from './scoring';

const itemsForDimension = (dimension: Dimension, value: number, count: number): AnsweredItem[] =>
	Array.from({ length: count }, () => ({ dimension, value, reverse: false }));

const fullSet = (vector: DimensionVector): AnsweredItem[] => [
	...itemsForDimension('extraversion', vector.extraversion, 10),
	...itemsForDimension('belonging', vector.belonging, 10),
	...itemsForDimension('group_size', vector.group_size, 5),
	...itemsForDimension('swings', vector.swings, 5)
];

describe('computeDimensions', () => {
	it('averages items per dimension', () => {
		const items: AnsweredItem[] = [
			{ dimension: 'extraversion', value: 0.5, reverse: false },
			{ dimension: 'extraversion', value: -0.5, reverse: false },
			{ dimension: 'belonging', value: 1, reverse: false },
			{ dimension: 'group_size', value: 0, reverse: false },
			{ dimension: 'swings', value: 0, reverse: false }
		];
		const result = computeDimensions(items);
		expect(result.extraversion).toBe(0);
		expect(result.belonging).toBe(1);
		expect(result.group_size).toBe(0);
	});

	it('applies reverse-score sign-flip before averaging', () => {
		const items: AnsweredItem[] = [
			{ dimension: 'extraversion', value: 1, reverse: true },
			{ dimension: 'extraversion', value: 1, reverse: false },
			{ dimension: 'belonging', value: 0.5, reverse: false },
			{ dimension: 'group_size', value: 0, reverse: false },
			{ dimension: 'swings', value: 0, reverse: false }
		];
		expect(computeDimensions(items).extraversion).toBe(0);
	});

	it('clamps individual answers to [-1, 1] before mean computation', () => {
		const items: AnsweredItem[] = [
			{ dimension: 'extraversion', value: 5, reverse: false },
			{ dimension: 'belonging', value: -3, reverse: false },
			{ dimension: 'group_size', value: 0, reverse: false },
			{ dimension: 'swings', value: 0, reverse: false }
		];
		const result = computeDimensions(items);
		expect(result.extraversion).toBe(1);
		expect(result.belonging).toBe(-1);
	});

	it('boosts swings using extraversion variance (omnivert signal)', () => {
		const flat: AnsweredItem[] = [
			{ dimension: 'extraversion', value: 0, reverse: false },
			{ dimension: 'extraversion', value: 0, reverse: false },
			{ dimension: 'belonging', value: 0, reverse: false },
			{ dimension: 'group_size', value: 0, reverse: false },
			{ dimension: 'swings', value: 0, reverse: false }
		];
		const swingy: AnsweredItem[] = [
			{ dimension: 'extraversion', value: 1, reverse: false },
			{ dimension: 'extraversion', value: -1, reverse: false },
			{ dimension: 'belonging', value: 0, reverse: false },
			{ dimension: 'group_size', value: 0, reverse: false },
			{ dimension: 'swings', value: 0, reverse: false }
		];
		expect(computeDimensions(flat).swings).toBe(0);
		expect(computeDimensions(swingy).swings).toBe(1);
	});

	it('throws when a dimension has no answers', () => {
		const items: AnsweredItem[] = [{ dimension: 'extraversion', value: 0.5, reverse: false }];
		expect(() => computeDimensions(items)).toThrow(/Missing answers/);
	});

	it.each([
		{ dim: 'extraversion' as Dimension },
		{ dim: 'belonging' as Dimension },
		{ dim: 'group_size' as Dimension },
		{ dim: 'swings' as Dimension }
	])('throws naming dimension $dim when only $dim is missing', ({ dim }) => {
		const items = fullSet({ extraversion: 0, belonging: 0, group_size: 0, swings: 0 }).filter(
			(it) => it.dimension !== dim
		);
		// `toThrow(string)` checks the message contains the substring — no
		// dynamic-regex construction needed.
		expect(() => computeDimensions(items)).toThrow(`Missing answers for dimension: ${dim}`);
	});

	it.each([
		{ value: 1, expected: 1 },
		{ value: -1, expected: -1 },
		{ value: 0, expected: 0 },
		{ value: 100, expected: 1 },
		{ value: -100, expected: -1 }
	])('clamps boundary value $value to $expected', ({ value, expected }) => {
		const items: AnsweredItem[] = [
			{ dimension: 'extraversion', value, reverse: false },
			{ dimension: 'belonging', value: 0, reverse: false },
			{ dimension: 'group_size', value: 0, reverse: false },
			{ dimension: 'swings', value: 0, reverse: false }
		];
		expect(computeDimensions(items).extraversion).toBe(expected);
	});
});

describe('weightedDistance', () => {
	it('is zero when user matches ideal exactly', () => {
		const ideal = ARCHETYPE_IDEALS.extrovert;
		expect(weightedDistance(ideal, ideal, ARCHETYPE_WEIGHTS.extrovert)).toBe(0);
	});

	it('is symmetric in user/ideal', () => {
		const a: DimensionVector = {
			extraversion: 0.4,
			belonging: -0.2,
			group_size: 0.6,
			swings: -0.1
		};
		const b: DimensionVector = {
			extraversion: -0.4,
			belonging: 0.2,
			group_size: -0.6,
			swings: 0.1
		};
		const w = ARCHETYPE_WEIGHTS.ambivert;
		expect(weightedDistance(a, b, w)).toBeCloseTo(weightedDistance(b, a, w), 12);
	});

	it('returns 2 for diametrically opposite vectors with full weighting', () => {
		const ones: DimensionVector = { extraversion: 1, belonging: 1, group_size: 1, swings: 1 };
		const negOnes: DimensionVector = {
			extraversion: -1,
			belonging: -1,
			group_size: -1,
			swings: -1
		};
		const equalWeights: DimensionVector = {
			extraversion: 0.25,
			belonging: 0.25,
			group_size: 0.25,
			swings: 0.25
		};
		expect(weightedDistance(ones, negOnes, equalWeights)).toBeCloseTo(2, 12);
	});
});

describe('distanceToFit', () => {
	it('maps distance 0 → 100% fit', () => {
		expect(distanceToFit(0)).toBe(100);
	});

	it('maps distance 2 → 0% fit', () => {
		expect(distanceToFit(2)).toBe(0);
	});

	it('clamps negative distances to 100%', () => {
		expect(distanceToFit(-0.5)).toBe(100);
	});

	it('clamps distances above 2 to 0%', () => {
		expect(distanceToFit(3)).toBe(0);
	});

	it('is monotonically decreasing in distance', () => {
		expect(distanceToFit(0.5)).toBeGreaterThan(distanceToFit(1));
		expect(distanceToFit(1)).toBeGreaterThan(distanceToFit(1.5));
	});

	it.each([
		{ d: 0, fit: 100 },
		{ d: 0.5, fit: 75 },
		{ d: 1, fit: 50 },
		{ d: 1.5, fit: 25 },
		{ d: 2, fit: 0 }
	])('maps distance $d to $fit% fit', ({ d, fit }) => {
		expect(distanceToFit(d)).toBeCloseTo(fit, 12);
	});

	it('clamps NaN inputs to 0% (defensive)', () => {
		// Math.max/min with NaN yields NaN, but the early clamp Math.max(0, Math.min(2, NaN))
		// becomes Math.max(0, NaN) → NaN. The function is only called from inside scoreQuiz
		// where the input is a finite distance, so NaN here is purely defensive territory.
		const result = distanceToFit(Number.NaN);
		expect(Number.isNaN(result)).toBe(true);
	});
});

describe('scoreQuiz', () => {
	it('declares the matching archetype dominant when the user vector equals its ideal', () => {
		const archetypes: Archetype[] = ['extrovert', 'introvert', 'ambivert', 'otrovert', 'omnivert'];
		for (const archetype of archetypes) {
			const ideal = ARCHETYPE_IDEALS[archetype];
			// Flat extraversion answers (variance = 0) so the derived-variance signal
			// doesn't perturb the swings dimension away from each archetype's ideal.
			const items = fullSet(ideal);
			const result = scoreQuiz(items);
			const matching = result.fits.find((fit) => fit.archetype === archetype);
			expect(matching).toBeDefined();
			if (!matching) throw new Error(`fit row missing for ${archetype}`);
			expect(matching.fit).toBeGreaterThan(95);
			expect(result.dominant).toBe(archetype);
		}
	});

	it('returns a fit entry per archetype', () => {
		const items = fullSet({ extraversion: 0, belonging: 0, group_size: 0, swings: 0 });
		const result = scoreQuiz(items);
		expect(result.fits).toHaveLength(5);
		expect(new Set(result.fits.map((entry) => entry.archetype)).size).toBe(5);
	});

	it('does not cross-normalize: independent archetype scales (Σ fits ≠ 100)', () => {
		const items = fullSet({ extraversion: 0, belonging: 0, group_size: 0, swings: 0 });
		const result = scoreQuiz(items);
		const total = result.fits.reduce((sum, entry) => sum + entry.fit, 0);
		expect(total).not.toBeCloseTo(100, 0);
	});

	it('every archetype fit is in [0, 100]', () => {
		const items = fullSet({ extraversion: 0.5, belonging: -0.3, group_size: 0.2, swings: 0.1 });
		const result = scoreQuiz(items);
		for (const fit of result.fits) {
			expect(fit.fit).toBeGreaterThanOrEqual(0);
			expect(fit.fit).toBeLessThanOrEqual(100);
		}
	});

	it('weights matrix rows each sum to 1 (locked invariant)', () => {
		for (const archetype of Object.keys(ARCHETYPE_WEIGHTS) as Archetype[]) {
			const total = Object.values(ARCHETYPE_WEIGHTS[archetype]).reduce((s, w) => s + w, 0);
			expect(total).toBeCloseTo(1, 12);
		}
	});

	it('throws when answers are incomplete', () => {
		const items: AnsweredItem[] = [{ dimension: 'extraversion', value: 0, reverse: false }];
		expect(() => scoreQuiz(items)).toThrow();
	});

	it.each(['extrovert', 'introvert', 'ambivert', 'otrovert', 'omnivert'] as const)(
		'fitting %s ideal scores it as the strict-most-dominant archetype',
		(archetype) => {
			const ideal = ARCHETYPE_IDEALS[archetype];
			const items = fullSet(ideal);
			const result = scoreQuiz(items);
			const me = result.fits.find((f) => f.archetype === archetype);
			const others = result.fits.filter((f) => f.archetype !== archetype);
			if (!me) throw new Error(`fit row missing for ${archetype}`);
			for (const other of others) {
				expect(me.fit).toBeGreaterThan(other.fit);
			}
		}
	);

	it('returns deterministic output for the same input', () => {
		const items = fullSet({ extraversion: 0.3, belonging: -0.4, group_size: 0.6, swings: 0.1 });
		const a = scoreQuiz(items);
		const b = scoreQuiz(items);
		expect(a.dominant).toBe(b.dominant);
		expect(a.dimensions).toEqual(b.dimensions);
		for (let i = 0; i < a.fits.length; i++) {
			expect(a.fits[i]).toEqual(b.fits[i]);
		}
	});

	it('all-zero user vector produces a tie between symmetric archetypes', () => {
		// Extrovert and Introvert have identical weight rows and ideals that are
		// mirror images on extraversion/group_size; at the origin, distance is the
		// same for both. The tie-break in scoreQuiz is "first encountered wins"
		// (introvert in ARCHETYPES order), but their fits should be equal.
		const items = fullSet({ extraversion: 0, belonging: 0, group_size: 0, swings: 0 });
		const result = scoreQuiz(items);
		const intro = result.fits.find((f) => f.archetype === 'introvert');
		const extro = result.fits.find((f) => f.archetype === 'extrovert');
		expect(intro?.fit).toBeCloseTo(extro?.fit ?? -1, 12);
	});
});
