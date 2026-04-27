import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

const { questions } = await import('../questions');
const { createAnswersStore, QUESTIONS_BY_DIMENSION, questionsByDimension } =
	await import('./answers.svelte');
import type { Dimension, Question } from '../questions';

const STORAGE_KEY = 'multivert.answers.v1';

const pickQuestion = (idx: number): Question => {
	const q = questions[idx];
	if (!q) throw new Error(`question bank does not have an entry at index ${idx}`);
	return q;
};

const firstWhere = (pred: (q: Question) => boolean): Question => {
	const q = questions.find(pred);
	if (!q) throw new Error('no question matched the predicate');
	return q;
};

const requireString = (value: string | null): string => {
	if (value === null) throw new Error('localStorage key was unexpectedly null');
	return value;
};

const setEvery = (
	store: ReturnType<typeof createAnswersStore>,
	value = 0,
	state: 'answered' | 'in-progress' = 'answered'
) => {
	for (const q of questions) {
		store.setAnswer(q.id, { value, state });
	}
};

describe('createAnswersStore', () => {
	beforeEach(() => {
		const inner = new Map<string, string>();
		const fakeStorage: Storage = {
			get length() {
				return inner.size;
			},
			clear: () => inner.clear(),
			getItem: (key) => inner.get(key) ?? null,
			key: (index) => Array.from(inner.keys())[index] ?? null,
			removeItem: (key) => {
				inner.delete(key);
			},
			setItem: (key, value) => {
				inner.set(key, value);
			}
		};
		vi.stubGlobal('localStorage', fakeStorage);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('seeds an unset entry per question', () => {
		const store = createAnswersStore();
		expect(Object.keys(store.answers)).toHaveLength(questions.length);
		for (const q of questions) {
			expect(store.answers[q.id]).toEqual({ value: null, state: 'unset' });
		}
	});

	it('reports zero answered initially', () => {
		const store = createAnswersStore();
		expect(store.totalAnswered).toBe(0);
		expect(store.allAnswered).toBe(false);
		expect(store.result).toBeNull();
	});

	it('counts only answered entries (in-progress does not count)', () => {
		const store = createAnswersStore();
		const first = pickQuestion(0);
		store.setAnswer(first.id, { value: 0.5, state: 'in-progress' });
		expect(store.totalAnswered).toBe(0);
		store.setAnswer(first.id, { value: 0.5, state: 'answered' });
		expect(store.totalAnswered).toBe(1);
	});

	it('produces a non-null result once all questions are answered', () => {
		const store = createAnswersStore();
		setEvery(store, 0);
		expect(store.allAnswered).toBe(true);
		const result = store.result;
		expect(result).not.toBeNull();
		if (result === null) return;
		expect(result.fits).toHaveLength(5);
		expect(result.dominant).toMatch(/introvert|extrovert|ambivert|otrovert|omnivert/);
	});

	it('groups answered counts by dimension', () => {
		const store = createAnswersStore();
		const firstE = firstWhere((q) => q.dimension === 'extraversion');
		store.setAnswer(firstE.id, { value: 1, state: 'answered' });
		const counts = store.answeredByDimension;
		expect(counts.extraversion.answered).toBe(1);
		expect(counts.belonging.answered).toBe(0);
		expect(counts.extraversion.total).toBe(10);
		expect(counts.belonging.total).toBe(10);
		expect(counts.group_size.total).toBe(5);
		expect(counts.swings.total).toBe(5);
	});

	it('persists every change to localStorage', () => {
		const store = createAnswersStore();
		const id = pickQuestion(0).id;
		store.setAnswer(id, { value: 0.42, state: 'answered' });
		const raw = requireString(globalThis.localStorage.getItem(STORAGE_KEY));
		const parsed: Record<string, { value: number; state: string }> = JSON.parse(raw);
		expect(parsed[id]).toEqual({ value: 0.42, state: 'answered' });
	});

	it('hydrates from localStorage on construction', () => {
		const id = pickQuestion(0).id;
		globalThis.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ [id]: { value: -0.7, state: 'answered' } })
		);
		const store = createAnswersStore();
		expect(store.answers[id]).toEqual({ value: -0.7, state: 'answered' });
		expect(store.totalAnswered).toBe(1);
	});

	it('clamps hydrated values to [-1, 1] and resets non-finite to seeded unset', () => {
		const a = pickQuestion(0);
		const b = pickQuestion(1);
		const c = pickQuestion(2);
		globalThis.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				[a.id]: { value: 5, state: 'answered' },
				[b.id]: { value: -3, state: 'answered' },
				[c.id]: { value: Number.NaN, state: 'answered' }
			})
		);
		const store = createAnswersStore();
		expect(store.answers[a.id]).toEqual({ state: 'answered', value: 1 });
		expect(store.answers[b.id]).toEqual({ state: 'answered', value: -1 });
		// `answered` with NaN is corrupt — reset to the seeded `unset` entry so
		// the discriminated union's invariant (answered ⇒ value: number) holds.
		expect(store.answers[c.id]).toEqual({ state: 'unset', value: null });
	});

	it('falls back to seed when stored payload is malformed JSON', () => {
		globalThis.localStorage.setItem(STORAGE_KEY, '{not-json');
		const store = createAnswersStore();
		expect(store.totalAnswered).toBe(0);
		const first = pickQuestion(0);
		expect(store.answers[first.id]).toEqual({ value: null, state: 'unset' });
	});

	it('falls back to seed when stored payload is not an object', () => {
		globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(['not', 'an', 'object']));
		const store = createAnswersStore();
		expect(store.totalAnswered).toBe(0);
	});

	it('drops entries with unknown state strings back to seeded unset', () => {
		const id = pickQuestion(0).id;
		globalThis.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ [id]: { value: 0.3, state: 'bogus' } })
		);
		const store = createAnswersStore();
		// Unknown state → fall through to the seeded entry. Value is dropped
		// alongside the state so the discriminated union stays consistent.
		expect(store.answers[id]).toEqual({ state: 'unset', value: null });
	});

	it('ignores unknown question ids in the stored payload', () => {
		globalThis.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ 'not-a-real-id': { value: 0.5, state: 'answered' } })
		);
		const store = createAnswersStore();
		expect(store.totalAnswered).toBe(0);
	});

	it('reset() clears all answers and persists the cleared state', () => {
		const store = createAnswersStore();
		setEvery(store, 0.4);
		expect(store.totalAnswered).toBe(questions.length);
		store.reset();
		expect(store.totalAnswered).toBe(0);
		const raw = requireString(globalThis.localStorage.getItem(STORAGE_KEY));
		const parsed: Record<string, { value: number | null; state: string }> = JSON.parse(raw);
		const first = pickQuestion(0);
		expect(parsed[first.id]).toEqual({ value: null, state: 'unset' });
	});
});

describe('QUESTIONS_BY_DIMENSION (constant)', () => {
	it('matches the legacy questionsByDimension() helper', () => {
		const constant = QUESTIONS_BY_DIMENSION;
		const helper = questionsByDimension();
		expect(constant.extraversion.map((q) => q.id)).toEqual(helper.extraversion.map((q) => q.id));
		expect(constant.belonging.map((q) => q.id)).toEqual(helper.belonging.map((q) => q.id));
		expect(constant.group_size.map((q) => q.id)).toEqual(helper.group_size.map((q) => q.id));
		expect(constant.swings.map((q) => q.id)).toEqual(helper.swings.map((q) => q.id));
	});
});

describe('questionsByDimension', () => {
	it('groups questions by their dimension and preserves source order', () => {
		const grouped = questionsByDimension();
		expect(grouped.extraversion).toHaveLength(10);
		expect(grouped.belonging).toHaveLength(10);
		expect(grouped.group_size).toHaveLength(5);
		expect(grouped.swings).toHaveLength(5);

		const flatIds = [
			...grouped.extraversion,
			...grouped.belonging,
			...grouped.group_size,
			...grouped.swings
		].map((q) => q.id);

		const order: Record<Dimension, number> = {
			extraversion: 0,
			belonging: 1,
			group_size: 2,
			swings: 3
		};
		const dimensionOrder = questions
			.slice()
			.sort((a, b) => order[a.dimension] - order[b.dimension])
			.map((q) => q.id);
		expect(flatIds).toEqual(dimensionOrder);
	});
});
