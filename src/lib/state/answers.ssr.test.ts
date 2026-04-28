import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// SSR-equivalent context: `$app/environment` reports `browser: false`.
// The store has belt-and-braces guards in `readStoredAnswers` and `persist`
// that short-circuit when not in the browser. These tests exercise those
// guards specifically — the main answers.test.ts mocks `browser: true` so
// those branches are otherwise unreachable.
vi.mock('$app/environment', () => ({ browser: false }));

const { questions } = await import('../questions');
const { createAnswersStore } = await import('./answers.svelte');

const STORAGE_KEY = 'multivert.answers.v1';

describe('createAnswersStore — SSR / browser=false', () => {
	let storage: Map<string, string>;

	beforeEach(() => {
		storage = new Map();
		const fakeStorage: Storage = {
			get length() {
				return storage.size;
			},
			clear: () => storage.clear(),
			getItem: (key) => storage.get(key) ?? null,
			key: (index) => Array.from(storage.keys())[index] ?? null,
			removeItem: (key) => {
				storage.delete(key);
			},
			setItem: (key, value) => {
				storage.set(key, value);
			}
		};
		vi.stubGlobal('localStorage', fakeStorage);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('does not read from localStorage during hydration when not in the browser', () => {
		// Seed the store with a value that, if read, would be visible. The
		// browser=false guard must skip the read so the store falls back to
		// the seeded `unset` map instead of hydrating from storage.
		const first = questions[0]!;
		storage.set(STORAGE_KEY, JSON.stringify({ [first.id]: { state: 'answered', value: 0.5 } }));

		const store = createAnswersStore();

		expect(store.totalAnswered).toBe(0);
		expect(store.answers[first.id]).toEqual({ state: 'unset', value: null });
	});

	it('does not write to localStorage when setAnswer is called outside the browser', () => {
		const store = createAnswersStore();
		const first = questions[0]!;

		store.setAnswer(first.id, { state: 'answered', value: 0.25 });

		// In-memory state still updates (the store is reactive regardless).
		expect(store.answers[first.id]).toEqual({ state: 'answered', value: 0.25 });
		// But nothing was persisted: the persist guard short-circuited.
		expect(storage.get(STORAGE_KEY)).toBeUndefined();
	});

	it('reset() leaves localStorage untouched outside the browser', () => {
		const store = createAnswersStore();
		store.reset();
		expect(storage.get(STORAGE_KEY)).toBeUndefined();
	});
});
