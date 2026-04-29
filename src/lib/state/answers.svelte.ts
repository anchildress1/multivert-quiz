import { browser } from '$app/environment';
import type { Dimension } from '$lib/archetypes';
import { questions, type Question } from '$lib/questions';
import { scoreQuiz, type AnsweredItem, type QuizResult } from '$lib/scoring';

/**
 * Reactive answers store.
 *
 * SSR contract: this module is safe to import on the server, but the actual
 * `createAnswersStore` factory should only be invoked in the browser. The
 * route that hosts the quiz disables SSR (see `src/routes/+page.ts`) so the
 * factory only runs after hydration. The `if (!browser)` guards in
 * `readStoredAnswers` and `persist` exist as belt-and-braces.
 *
 * Storage versioning: `STORAGE_KEY` includes a `.v1` suffix. If the
 * `AnswerEntry` shape ever changes, bump the suffix and (optionally) write a
 * one-shot migration in `readStoredAnswers`.
 */

const STORAGE_KEY = 'multivert.answers.v1';

/**
 * Discriminated union: an `answered` entry is guaranteed to carry a numeric
 * value, while `unset` carries `null` and `in-progress` reflects a slider
 * mid-drag (always numeric, but not yet committed). The compiler enforces
 * the invariant at every consumer.
 */
export type AnswerEntry =
	| { state: 'unset'; value: null }
	| { state: 'in-progress'; value: number }
	| { state: 'answered'; value: number };

type AnswerMap = Record<string, AnswerEntry>;

const seedAnswers = (): AnswerMap => {
	const seed: AnswerMap = {};
	for (const q of questions) {
		seed[q.id] = { state: 'unset', value: null };
	}
	return seed;
};

const parseStoredEntry = (entry: unknown): AnswerEntry | null => {
	if (!entry || typeof entry !== 'object') return null;
	const candidate = entry as { value?: unknown; state?: unknown };
	const numericValue =
		typeof candidate.value === 'number' && Number.isFinite(candidate.value)
			? Math.max(-1, Math.min(1, candidate.value))
			: null;
	if (numericValue === null) return null;
	if (candidate.state === 'answered') return { state: 'answered', value: numericValue };
	if (candidate.state === 'in-progress') return { state: 'in-progress', value: numericValue };
	return null;
};

const readStoredAnswers = (): AnswerMap | null => {
	if (!browser) return null;
	try {
		const raw = globalThis.sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		const merged = seedAnswers();
		for (const [id, entry] of Object.entries(parsed as Record<string, unknown>)) {
			if (!(id in merged)) continue;
			const next = parseStoredEntry(entry);
			if (next) merged[id] = next;
		}
		return merged;
	} catch (err) {
		if (err instanceof DOMException || err instanceof SyntaxError) {
			console.warn('[answers] Could not read stored answers:', (err as Error).name);
			return null;
		}
		throw err;
	}
};

const persist = (state: AnswerMap): void => {
	if (!browser) return;
	try {
		globalThis.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (err) {
		/* v8 ignore next — quota / private-mode restriction; answers are session-only */
		console.warn('[answers] persist failed — answers are tab-session-only:', (err as Error).name);
	}
};

export const createAnswersStore = () => {
	const answers = $state<AnswerMap>(readStoredAnswers() ?? seedAnswers());

	const totalAnswered = $derived(
		Object.values(answers).filter((entry) => entry.state === 'answered').length
	);

	const total = questions.length;

	const allAnswered = $derived(totalAnswered === total);

	const answeredByDimension = $derived.by(() => {
		const counts: Record<Dimension, { answered: number; total: number }> = {
			extraversion: { answered: 0, total: 0 },
			belonging: { answered: 0, total: 0 },
			group_size: { answered: 0, total: 0 },
			swings: { answered: 0, total: 0 }
		};
		for (const q of questions) {
			counts[q.dimension].total += 1;
			if (answers[q.id]?.state === 'answered') counts[q.dimension].answered += 1;
		}
		return counts;
	});

	const result = $derived.by((): QuizResult | null => {
		if (!allAnswered) return null;
		const items: AnsweredItem[] = [];
		for (const q of questions) {
			const entry = answers[q.id];
			/* v8 ignore next 3 — `allAnswered` proves every entry is the answered
			   variant; the runtime check exists so a corrupt store can't reach
			   `scoreQuiz` with a partial vector. */
			if (entry?.state !== 'answered') {
				return null;
			}
			items.push({ dimension: q.dimension, value: entry.value, reverse: q.reverse });
		}
		try {
			return scoreQuiz(items);
		} catch (err) {
			console.error('[scoring] scoreQuiz threw unexpectedly:', err);
			return null;
		}
	});

	const setAnswer = (id: string, next: AnswerEntry): void => {
		answers[id] = next;
		persist(answers);
	};

	const reset = (): void => {
		const fresh = seedAnswers();
		for (const q of questions) {
			answers[q.id] = fresh[q.id]!;
		}
		persist(answers);
	};

	return {
		get answers() {
			return answers;
		},
		get totalAnswered() {
			return totalAnswered;
		},
		get total() {
			return total;
		},
		get allAnswered() {
			return allAnswered;
		},
		get answeredByDimension() {
			return answeredByDimension;
		},
		get result() {
			return result;
		},
		setAnswer,
		reset
	};
};

export type AnswersStore = ReturnType<typeof createAnswersStore>;

/** Pre-grouped questions by dimension. Computed once at module load. */
export const QUESTIONS_BY_DIMENSION: Readonly<Record<Dimension, readonly Question[]>> = (() => {
	const grouped: Record<Dimension, Question[]> = {
		extraversion: [],
		belonging: [],
		group_size: [],
		swings: []
	};
	for (const q of questions) grouped[q.dimension].push(q);
	return Object.freeze(grouped);
})();
