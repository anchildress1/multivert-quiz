import { describe, expect, it } from 'vitest';
import { ARCHETYPES, type Archetype } from './archetypes';
import { descriptions, type DeepDescription } from './descriptions';

const TYPES: readonly Archetype[] = ARCHETYPES;

describe('descriptions registry — invariants', () => {
	it('has exactly one entry per archetype, keyed by archetype', () => {
		expect(Object.keys(descriptions).sort()).toEqual([...TYPES].sort());
	});

	it('exposes only the field-guide schema (no `type` field, no encyclopedia leftovers)', () => {
		const expectedTopKeys = ['body', 'deep', 'headline'];
		for (const t of TYPES) {
			expect(Object.keys(descriptions[t]).sort()).toEqual(expectedTopKeys);
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

	it('otrovert.body keeps the `\\n\\n` paragraph separator the renderer splits on', () => {
		expect(descriptions.otrovert.body.split('\n\n')).toHaveLength(3);
	});
});

describe('descriptions registry — field-guide deep block', () => {
	const requiredScalarFields: readonly (keyof DeepDescription)[] = [
		'dayInTheLife',
		'whatHelps',
		'whatKillsYou',
		'youllNeverAdmit'
	];

	it.each(TYPES)('%s has a populated deep block', (t) => {
		const deep = descriptions[t].deep;
		expect(deep).toBeDefined();
	});

	it.each(TYPES)('%s.dayInTheLife is a substantial vignette (≥220 chars)', (t) => {
		const text = descriptions[t].deep.dayInTheLife;
		expect(text.trim().length).toBeGreaterThanOrEqual(220);
	});

	it.each(TYPES)('%s has exactly five distinct, non-trivial trueThings', (t) => {
		const { trueThings } = descriptions[t].deep;
		expect(trueThings.length).toBe(5);
		expect(new Set(trueThings).size).toBe(trueThings.length);
		for (const line of trueThings) {
			expect(line.trim().length).toBeGreaterThanOrEqual(20);
		}
	});

	it.each(TYPES)('%s has exactly 3 distinct, non-trivial giveaways', (t) => {
		const { giveaways } = descriptions[t].deep;
		expect(giveaways.length).toBe(3);
		expect(new Set(giveaways).size).toBe(giveaways.length);
		for (const tell of giveaways) {
			expect(tell.trim().length).toBeGreaterThanOrEqual(20);
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

	it('the deep block exposes only the field-guide sections', () => {
		const expectedKeys = [
			'dayInTheLife',
			'giveaways',
			'trueThings',
			'whatHelps',
			'whatKillsYou',
			'youllNeverAdmit'
		];
		for (const t of TYPES) {
			expect(Object.keys(descriptions[t].deep).sort()).toEqual(expectedKeys);
		}
	});
});
