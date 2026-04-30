import { describe, expect, it } from 'vitest';
import { ARCHETYPES, type Archetype } from './archetypes';
import { descriptions, type DeepDescription } from './descriptions';

const TYPES: readonly Archetype[] = ARCHETYPES;

describe('descriptions registry — invariants', () => {
	it('has exactly one entry per archetype, keyed by archetype', () => {
		expect(Object.keys(descriptions).sort()).toEqual([...TYPES].sort());
		for (const t of TYPES) {
			expect(descriptions[t].type).toBe(t);
		}
	});

	it('is frozen so callers cannot mutate the canonical copy at runtime', () => {
		expect(Object.isFrozen(descriptions)).toBe(true);
	});

	it.each(TYPES)('%s has a non-trivial headline and body', (t) => {
		const d = descriptions[t];
		expect(d.headline.length).toBeGreaterThanOrEqual(10);
		expect(d.body.length).toBeGreaterThanOrEqual(80);
	});
});

describe('descriptions registry — deep editorial copy', () => {
	const requiredScalarFields: readonly (keyof DeepDescription)[] = [
		'mistakenFor',
		'gifts',
		'costs',
		'recharge'
	];

	it.each(TYPES)('%s has a populated deep block', (t) => {
		const deep = descriptions[t].deep;
		expect(deep).toBeDefined();
	});

	it.each(TYPES)('%s deep block has 4–5 distinct, non-empty signs', (t) => {
		const { signs } = descriptions[t].deep;
		expect(signs.length).toBeGreaterThanOrEqual(4);
		expect(signs.length).toBeLessThanOrEqual(5);
		expect(new Set(signs).size).toBe(signs.length);
		for (const sign of signs) {
			expect(sign.trim().length).toBeGreaterThanOrEqual(20);
		}
	});

	it.each(TYPES.flatMap((t) => requiredScalarFields.map((f) => [t, f] as const)))(
		'%s.%s is a non-trivial sentence',
		(t, field) => {
			const value = descriptions[t].deep[field];
			expect(typeof value).toBe('string');
			expect((value as string).trim().length).toBeGreaterThanOrEqual(30);
		}
	);

	it.each(TYPES)('%s deep block has at least two sources', (t) => {
		const { sources } = descriptions[t].deep;
		expect(sources.length).toBeGreaterThanOrEqual(2);
		for (const src of sources) {
			expect(src.trim().length).toBeGreaterThan(0);
		}
	});

	it("otrovert sources reference Rami Kaminski (the construct's coiner)", () => {
		const text = descriptions.otrovert.deep.sources.join(' ').toLowerCase();
		expect(text).toContain('kaminski');
	});

	it('ambivert sources reference Adam Grant (the canonical study)', () => {
		const text = descriptions.ambivert.deep.sources.join(' ').toLowerCase();
		expect(text).toContain('grant');
	});
});
