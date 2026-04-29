import { describe, expect, it } from 'vitest';
import {
	archetypeFit,
	computeDimensions,
	scoreQuiz,
	type AnsweredItem,
	type Archetype,
	type Dimension,
	type DimensionVector
} from './scoring';

const itemsForDimension = (dimension: Dimension, value: number, count: number): AnsweredItem[] =>
	Array.from({ length: count }, () => ({ dimension, value, reverse: false }));

const VECTOR_AT_ZERO: DimensionVector = {
	extraversion: 0,
	belonging: 0,
	group_size: 0,
	swings: 0,
	extra_variance: 0
};

/**
 * Build a 35-item answer set whose per-dimension means equal `target.{dim}`.
 * `extraVarianceMode = 'split'` produces variance = 1 by splitting the 10
 * extra items into 5 strong-positive and 5 strong-negative answers (mean 0).
 */
const fullSet = (
	target: { extraversion: number; belonging: number; group_size: number; swings: number },
	extraVarianceMode: 'flat' | 'split' = 'flat'
): AnsweredItem[] => {
	const extras: AnsweredItem[] =
		extraVarianceMode === 'flat'
			? itemsForDimension('extraversion', target.extraversion, 10)
			: [...itemsForDimension('extraversion', 1, 5), ...itemsForDimension('extraversion', -1, 5)];
	return [
		...extras,
		...itemsForDimension('belonging', target.belonging, 15),
		...itemsForDimension('group_size', target.group_size, 5),
		...itemsForDimension('swings', target.swings, 5)
	];
};

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

	it('extra_variance is raw: consistent answers → 0, fully split → 1', () => {
		const consistent: AnsweredItem[] = [
			{ dimension: 'extraversion', value: 0, reverse: false },
			{ dimension: 'extraversion', value: 0, reverse: false },
			{ dimension: 'belonging', value: 0, reverse: false },
			{ dimension: 'group_size', value: 0, reverse: false },
			{ dimension: 'swings', value: 0, reverse: false }
		];
		const split: AnsweredItem[] = [
			{ dimension: 'extraversion', value: 1, reverse: false },
			{ dimension: 'extraversion', value: -1, reverse: false },
			{ dimension: 'belonging', value: 0, reverse: false },
			{ dimension: 'group_size', value: 0, reverse: false },
			{ dimension: 'swings', value: 0, reverse: false }
		];
		expect(computeDimensions(consistent).extra_variance).toBe(0);
		expect(computeDimensions(split).extra_variance).toBe(1);
	});

	it('swings is the pure mean of swings items — variance no longer baked in', () => {
		const split: AnsweredItem[] = [
			{ dimension: 'extraversion', value: 1, reverse: false },
			{ dimension: 'extraversion', value: -1, reverse: false },
			{ dimension: 'belonging', value: 0, reverse: false },
			{ dimension: 'group_size', value: 0, reverse: false },
			{ dimension: 'swings', value: -0.4, reverse: false }
		];
		expect(computeDimensions(split).swings).toBe(-0.4);
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

describe('archetypeFit — locked baseline (all-zeros user vector)', () => {
	it('Ambivert reads 100% at the all-zeros baseline', () => {
		expect(archetypeFit(VECTOR_AT_ZERO, 'ambivert')).toBeCloseTo(100, 12);
	});

	it('Introvert and Extrovert each read 50% at the all-zeros baseline', () => {
		expect(archetypeFit(VECTOR_AT_ZERO, 'introvert')).toBeCloseTo(50, 12);
		expect(archetypeFit(VECTOR_AT_ZERO, 'extrovert')).toBeCloseTo(50, 12);
	});

	it('Otrovert reads 0% at the all-zeros baseline (one-sided axis: no otherness signal yet)', () => {
		expect(archetypeFit(VECTOR_AT_ZERO, 'otrovert')).toBeCloseTo(0, 12);
	});

	it('Otrovert is one-sided: positive belonging never goes below 0%', () => {
		for (const belong of [0, 0.25, 0.5, 1]) {
			const v: DimensionVector = {
				extraversion: 0,
				belonging: belong,
				group_size: 0,
				swings: 0,
				extra_variance: 0
			};
			expect(archetypeFit(v, 'otrovert')).toBeCloseTo(0, 12);
		}
	});

	it('Otrovert ramps linearly from belong=0 (0%) to belong=-1 (100%)', () => {
		const cases = [
			{ belong: 0, expected: 0 },
			{ belong: -0.25, expected: 25 },
			{ belong: -0.5, expected: 50 },
			{ belong: -0.75, expected: 75 },
			{ belong: -1, expected: 100 }
		];
		for (const { belong, expected } of cases) {
			const v: DimensionVector = {
				extraversion: 0,
				belonging: belong,
				group_size: 0,
				swings: 0,
				extra_variance: 0
			};
			expect(archetypeFit(v, 'otrovert')).toBeCloseTo(expected, 10);
		}
	});

	it('Omnivert reads 0% at the all-zeros baseline (no contradiction evidence)', () => {
		expect(archetypeFit(VECTOR_AT_ZERO, 'omnivert')).toBeCloseTo(0, 12);
	});
});

describe('archetypeFit — extreme answer patterns', () => {
	it('canonical Introvert pattern → 100% Introvert, 0% Extrovert', () => {
		const v: DimensionVector = {
			extraversion: -1,
			belonging: 1,
			group_size: -1,
			swings: -1,
			extra_variance: 0
		};
		expect(archetypeFit(v, 'introvert')).toBeCloseTo(100, 12);
		expect(archetypeFit(v, 'extrovert')).toBeCloseTo(0, 12);
		expect(archetypeFit(v, 'ambivert')).toBeCloseTo(0, 12);
	});

	it('canonical Extrovert pattern → 100% Extrovert, 0% Introvert', () => {
		const v: DimensionVector = {
			extraversion: 1,
			belonging: 1,
			group_size: 1,
			swings: -1,
			extra_variance: 0
		};
		expect(archetypeFit(v, 'extrovert')).toBeCloseTo(100, 12);
		expect(archetypeFit(v, 'introvert')).toBeCloseTo(0, 12);
		expect(archetypeFit(v, 'ambivert')).toBeCloseTo(0, 12);
	});

	it('canonical Otrovert pattern → 100% Otrovert', () => {
		const v: DimensionVector = {
			extraversion: 0,
			belonging: -1,
			group_size: 0,
			swings: 0,
			extra_variance: 0
		};
		expect(archetypeFit(v, 'otrovert')).toBeCloseTo(100, 12);
	});

	it('canonical Omnivert pattern (variance=1, swings=+1) → 100% Omnivert, 0% on stable types', () => {
		const v: DimensionVector = {
			extraversion: 0,
			belonging: 0,
			group_size: 0,
			swings: 1,
			extra_variance: 1
		};
		expect(archetypeFit(v, 'omnivert')).toBeCloseTo(100, 12);
		expect(archetypeFit(v, 'introvert')).toBeCloseTo(0, 12);
		expect(archetypeFit(v, 'extrovert')).toBeCloseTo(0, 12);
		expect(archetypeFit(v, 'ambivert')).toBeCloseTo(0, 12);
	});
});

describe('archetypeFit — co-scoring (independent axes)', () => {
	it('introverted otrovert scores 100% on both Introvert and Otrovert', () => {
		const v: DimensionVector = {
			extraversion: -1,
			belonging: -1,
			group_size: -1,
			swings: -1,
			extra_variance: 0
		};
		expect(archetypeFit(v, 'introvert')).toBeCloseTo(100, 12);
		expect(archetypeFit(v, 'otrovert')).toBeCloseTo(100, 12);
	});

	it('Otrovert score is independent of extraversion position', () => {
		const introOtro: DimensionVector = {
			extraversion: -1,
			belonging: -1,
			group_size: 0,
			swings: 0,
			extra_variance: 0
		};
		const extroOtro: DimensionVector = {
			extraversion: 1,
			belonging: -1,
			group_size: 0,
			swings: 0,
			extra_variance: 0
		};
		expect(archetypeFit(introOtro, 'otrovert')).toBeCloseTo(
			archetypeFit(extroOtro, 'otrovert'),
			12
		);
	});

	it('claiming stability without behavioural evidence does not push omnivert below variance baseline', () => {
		// variance=1 (chaotic behaviour), swings=-1 (claims rock-solid stability).
		// Omni should still reflect the strong behavioural signal — the denial
		// is treated as absence of a second confirming signal, not as
		// counter-evidence.
		const v: DimensionVector = {
			extraversion: 0,
			belonging: 0,
			group_size: 0,
			swings: -1,
			extra_variance: 1
		};
		// variance contribution = 1; bonus from swings = max(0, -1) = 0;
		// fit = (1 + 0) / 2 = 0.5 → 50%.
		expect(archetypeFit(v, 'omnivert')).toBeCloseTo(50, 12);
	});
});

describe('archetypeFit — chaotic answerer suppresses stable archetypes', () => {
	it('a chaotic user (extra_variance = 1) reads 0% on Introvert / Extrovert / Ambivert regardless of mean', () => {
		for (const extra of [-1, -0.5, 0, 0.5, 1]) {
			const v: DimensionVector = {
				extraversion: extra,
				belonging: 0,
				group_size: 0,
				swings: 0,
				extra_variance: 1
			};
			expect(archetypeFit(v, 'introvert')).toBeCloseTo(0, 12);
			expect(archetypeFit(v, 'extrovert')).toBeCloseTo(0, 12);
			expect(archetypeFit(v, 'ambivert')).toBeCloseTo(0, 12);
		}
	});
});

describe('scoreQuiz — end to end', () => {
	it('all-zeros bank → Ambivert 100%, Intro/Extro 50%, Otrovert/Omnivert 0%', () => {
		const items = fullSet({ extraversion: 0, belonging: 0, group_size: 0, swings: 0 }, 'flat');
		const result = scoreQuiz(items);

		const find = (a: Archetype) => result.fits.find((f) => f.archetype === a)?.fit ?? -1;
		expect(find('ambivert')).toBeCloseTo(100, 12);
		expect(find('introvert')).toBeCloseTo(50, 12);
		expect(find('extrovert')).toBeCloseTo(50, 12);
		expect(find('otrovert')).toBeCloseTo(0, 12);
		expect(find('omnivert')).toBeCloseTo(0, 12);
		expect(result.dominant).toBe('ambivert');
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
		// 100 + 50 + 50 + 0 + 0 = 200
		expect(total).toBeCloseTo(200, 10);
	});

	it('every archetype fit is in [0, 100]', () => {
		const items = fullSet({ extraversion: 0.5, belonging: -0.3, group_size: 0.2, swings: 0.1 });
		const result = scoreQuiz(items);
		for (const fit of result.fits) {
			expect(fit.fit).toBeGreaterThanOrEqual(0);
			expect(fit.fit).toBeLessThanOrEqual(100);
		}
	});

	it('throws when answers are incomplete', () => {
		const items: AnsweredItem[] = [{ dimension: 'extraversion', value: 0, reverse: false }];
		expect(() => scoreQuiz(items)).toThrow();
	});

	it.each([
		{
			archetype: 'introvert' as const,
			items: fullSet({ extraversion: -1, belonging: 1, group_size: -1, swings: -1 }, 'flat')
		},
		{
			archetype: 'extrovert' as const,
			items: fullSet({ extraversion: 1, belonging: 1, group_size: 1, swings: -1 }, 'flat')
		},
		{
			archetype: 'ambivert' as const,
			items: fullSet({ extraversion: 0, belonging: 0, group_size: 0, swings: 0 }, 'flat')
		},
		{
			archetype: 'otrovert' as const,
			items: fullSet({ extraversion: 0, belonging: -1, group_size: -1, swings: -1 }, 'flat')
		},
		{
			archetype: 'omnivert' as const,
			items: fullSet({ extraversion: 0, belonging: 0, group_size: 0, swings: 1 }, 'split')
		}
	])(
		'fitting $archetype scores it as the strict-most-dominant archetype',
		({ archetype, items }) => {
			const result = scoreQuiz(items);
			const me = result.fits.find((f) => f.archetype === archetype);
			const others = result.fits.filter((f) => f.archetype !== archetype);
			if (!me) throw new Error(`fit row missing for ${archetype}`);
			for (const other of others) {
				// Otrovert and Ambivert can co-score 100 on the canonical Otrovert
				// profile (extra=0, belong=-1) because the axes are independent —
				// neutral extraversion + low variance is also a perfect Ambivert.
				if (archetype === 'otrovert' && other.archetype === 'ambivert') {
					expect(me.fit).toBeGreaterThanOrEqual(other.fit);
					continue;
				}
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

	it('all-zero user vector ties Introvert and Extrovert (mirror-image projection)', () => {
		const items = fullSet({ extraversion: 0, belonging: 0, group_size: 0, swings: 0 });
		const result = scoreQuiz(items);
		const intro = result.fits.find((f) => f.archetype === 'introvert');
		const extro = result.fits.find((f) => f.archetype === 'extrovert');
		expect(intro?.fit).toBeCloseTo(extro?.fit ?? -1, 12);
	});
});
