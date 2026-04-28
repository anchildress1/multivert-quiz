import { describe, expect, it } from 'vitest';
import {
	ACCENT_ROTATION,
	ARCHETYPES,
	ARCHETYPE_IDEALS,
	ARCHETYPE_WEIGHTS,
	CHAPTERS,
	DIMENSIONS,
	VERT_NAMES,
	VERT_ORDER,
	type Archetype,
	type Dimension
} from './archetypes';

const ARCHETYPE_LITERALS: readonly Archetype[] = [
	'introvert',
	'extrovert',
	'ambivert',
	'omnivert',
	'otrovert'
];
const DIMENSION_LITERALS: readonly Dimension[] = [
	'extraversion',
	'belonging',
	'group_size',
	'swings'
];

describe('archetypes registry — invariants', () => {
	it('ARCHETYPES contains all five archetypes exactly once', () => {
		expect(new Set(ARCHETYPES)).toEqual(new Set(ARCHETYPE_LITERALS));
		expect(ARCHETYPES).toHaveLength(5);
	});

	it('DIMENSIONS contains all four dimensions exactly once', () => {
		expect(new Set(DIMENSIONS)).toEqual(new Set(DIMENSION_LITERALS));
		expect(DIMENSIONS).toHaveLength(4);
	});

	it('VERT_ORDER matches ARCHETYPES (display order ≡ canonical order)', () => {
		expect(VERT_ORDER).toEqual(ARCHETYPES);
	});

	it.each(ARCHETYPE_LITERALS)('VERT_NAMES has a name + label entry for %s', (archetype) => {
		const meta = VERT_NAMES[archetype];
		expect(meta).toBeDefined();
		expect(meta.name).toMatch(/^[A-Z][a-z]+$/);
		expect(meta.label.length).toBeGreaterThan(0);
	});

	it.each(ARCHETYPE_LITERALS)(
		'ARCHETYPE_WEIGHTS row for %s sums to 1 and has every dimension',
		(archetype) => {
			const row = ARCHETYPE_WEIGHTS[archetype];
			expect(Object.keys(row).sort()).toEqual([...DIMENSION_LITERALS].sort());
			const sum = Object.values(row).reduce((s, w) => s + w, 0);
			expect(sum).toBeCloseTo(1, 12);
			for (const w of Object.values(row)) {
				expect(w).toBeGreaterThanOrEqual(0);
				expect(w).toBeLessThanOrEqual(1);
			}
		}
	);

	it.each(ARCHETYPE_LITERALS)(
		'ARCHETYPE_IDEALS row for %s lives in [-1, 1] for every dimension',
		(archetype) => {
			const row = ARCHETYPE_IDEALS[archetype];
			expect(Object.keys(row).sort()).toEqual([...DIMENSION_LITERALS].sort());
			for (const v of Object.values(row)) {
				expect(v).toBeGreaterThanOrEqual(-1);
				expect(v).toBeLessThanOrEqual(1);
			}
		}
	);

	it('ARCHETYPE_WEIGHTS and ARCHETYPE_IDEALS are frozen', () => {
		expect(Object.isFrozen(ARCHETYPE_WEIGHTS)).toBe(true);
		expect(Object.isFrozen(ARCHETYPE_IDEALS)).toBe(true);
	});

	it('ARCHETYPES tuple is the same length as Object.keys(VERT_NAMES)', () => {
		expect(ARCHETYPES).toHaveLength(Object.keys(VERT_NAMES).length);
	});
});

describe('archetypes registry — chapter map', () => {
	it('produces exactly four chapters', () => {
		expect(CHAPTERS).toHaveLength(4);
	});

	it('each chapter dimension appears exactly once across the chapter list', () => {
		const dims = CHAPTERS.map((c) => c.dimension).sort();
		expect(dims).toEqual([...DIMENSION_LITERALS].sort());
	});

	it.each(['I', 'II', 'III', 'IV'] as const)('chapter numeral %s is present once', (numeral) => {
		expect(CHAPTERS.filter((c) => c.numeral === numeral)).toHaveLength(1);
	});

	it.each([['extraversion'], ['belonging'], ['group_size'], ['swings']] as const)(
		'chapter for %s references a known archetype',
		(dimension) => {
			const ch = CHAPTERS.find((c) => c.dimension === dimension);
			expect(ch).toBeDefined();
			if (!ch) throw new Error(`no chapter for ${dimension}`);
			expect(ARCHETYPES).toContain(ch.archetype);
		}
	);

	it('chapter ids are stable, kebab-case, and unique', () => {
		const ids = CHAPTERS.map((c) => c.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) {
			expect(id).toMatch(/^chapter-[a-z]+$/);
		}
	});
});

describe('archetypes registry — accent rotation', () => {
	it('uses only known archetypes', () => {
		for (const a of ACCENT_ROTATION) {
			expect(ARCHETYPES).toContain(a);
		}
	});

	it('contains every archetype at least once (no archetype starves the rotation)', () => {
		expect(new Set(ACCENT_ROTATION)).toEqual(new Set(ARCHETYPES));
	});
});
