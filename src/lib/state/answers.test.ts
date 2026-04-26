import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

const { questions } = await import('../questions');
const { createAnswersStore, questionsByDimension } = await import('./answers.svelte');

const STORAGE_KEY = 'multivert.answers.v1';

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
		vi.stubGlobal('window', {
			localStorage: {
				_store: new Map<string, string>(),
				getItem(key: string) {
					return this._store.get(key) ?? null;
				},
				setItem(key: string, value: string) {
					this._store.set(key, value);
				},
				removeItem(key: string) {
					this._store.delete(key);
				},
				clear() {
					this._store.clear();
				}
			}
		});
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
		const first = questions[0]!;
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
		expect(result!.fits).toHaveLength(5);
		expect(result!.dominant).toMatch(/introvert|extrovert|ambivert|otrovert|omnivert/);
	});

	it('groups answered counts by dimension', () => {
		const store = createAnswersStore();
		const firstE = questions.find((q) => q.dimension === 'extraversion')!;
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
		const id = questions[0]!.id;
		store.setAnswer(id, { value: 0.42, state: 'answered' });
		const raw = window.localStorage.getItem(STORAGE_KEY);
		expect(raw).toBeTruthy();
		const parsed = JSON.parse(raw!);
		expect(parsed[id]).toEqual({ value: 0.42, state: 'answered' });
	});

	it('hydrates from localStorage on construction', () => {
		const id = questions[0]!.id;
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ [id]: { value: -0.7, state: 'answered' } })
		);
		const store = createAnswersStore();
		expect(store.answers[id]).toEqual({ value: -0.7, state: 'answered' });
		expect(store.totalAnswered).toBe(1);
	});

	it('clamps hydrated values to [-1, 1] and ignores non-finite numbers', () => {
		const [a, b, c] = questions;
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				[a!.id]: { value: 5, state: 'answered' },
				[b!.id]: { value: -3, state: 'answered' },
				[c!.id]: { value: Number.NaN, state: 'answered' }
			})
		);
		const store = createAnswersStore();
		expect(store.answers[a!.id]!.value).toBe(1);
		expect(store.answers[b!.id]!.value).toBe(-1);
		expect(store.answers[c!.id]!.value).toBeNull();
	});

	it('falls back to seed when stored payload is malformed JSON', () => {
		window.localStorage.setItem(STORAGE_KEY, '{not-json');
		const store = createAnswersStore();
		expect(store.totalAnswered).toBe(0);
		expect(store.answers[questions[0]!.id]).toEqual({ value: null, state: 'unset' });
	});

	it('falls back to seed when stored payload is not an object', () => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['not', 'an', 'object']));
		const store = createAnswersStore();
		expect(store.totalAnswered).toBe(0);
	});

	it('coerces unknown state strings to "unset" when hydrating', () => {
		const id = questions[0]!.id;
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ [id]: { value: 0.3, state: 'bogus' } })
		);
		const store = createAnswersStore();
		expect(store.answers[id]).toEqual({ value: 0.3, state: 'unset' });
	});

	it('ignores unknown question ids in the stored payload', () => {
		window.localStorage.setItem(
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
		const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
		expect(raw[questions[0]!.id]).toEqual({ value: null, state: 'unset' });
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
		const dimensionOrder = questions
			.slice()
			.sort((a, b) => {
				const order: Record<string, number> = {
					extraversion: 0,
					belonging: 1,
					group_size: 2,
					swings: 3
				};
				return order[a.dimension]! - order[b.dimension]!;
			})
			.map((q) => q.id);
		expect(flatIds).toEqual(dimensionOrder);
	});
});
