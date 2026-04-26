import { browser } from '$app/environment';
import type { SliderState } from '$lib/components/Slider.svelte';
import { questions, type Question } from '$lib/questions';
import { scoreQuiz, type AnsweredItem, type Dimension, type QuizResult } from '$lib/scoring';

const STORAGE_KEY = 'multivert.answers.v1';

export interface AnswerEntry {
	value: number | null;
	state: SliderState;
}

type AnswerMap = Record<string, AnswerEntry>;

const seedAnswers = (): AnswerMap => {
	const seed: AnswerMap = {};
	for (const q of questions) {
		seed[q.id] = { value: null, state: 'unset' };
	}
	return seed;
};

const readStoredAnswers = (): AnswerMap | null => {
	if (!browser) return null;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		const merged = seedAnswers();
		for (const [id, entry] of Object.entries(parsed as Record<string, unknown>)) {
			if (!(id in merged) || !entry || typeof entry !== 'object') continue;
			const candidate = entry as Partial<AnswerEntry>;
			const value =
				typeof candidate.value === 'number' && Number.isFinite(candidate.value)
					? Math.max(-1, Math.min(1, candidate.value))
					: null;
			const state: SliderState =
				candidate.state === 'answered' || candidate.state === 'in-progress'
					? candidate.state
					: 'unset';
			merged[id] = { value, state };
		}
		return merged;
	} catch {
		return null;
	}
};

const persist = (state: AnswerMap): void => {
	if (!browser) return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		/* v8 ignore next — storage quota / private mode silently no-ops */
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
		const items: AnsweredItem[] = questions.map((q) => ({
			dimension: q.dimension,
			value: answers[q.id]!.value!,
			reverse: q.reverse
		}));
		return scoreQuiz(items);
	});

	const setAnswer = (id: string, next: AnswerEntry): void => {
		answers[id] = next;
		persist(answers);
	};

	const reset = (): void => {
		const fresh = seedAnswers();
		for (const id of Object.keys(answers)) {
			answers[id] = fresh[id]!;
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

export const questionsByDimension = (): Record<Dimension, Question[]> => {
	const grouped: Record<Dimension, Question[]> = {
		extraversion: [],
		belonging: [],
		group_size: [],
		swings: []
	};
	for (const q of questions) grouped[q.dimension].push(q);
	return grouped;
};
