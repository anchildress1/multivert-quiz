import type { Archetype } from './scoring';

export interface VertMeta {
	name: string;
	label: string;
}

/** Canonical display labels and one-line descriptions per archetype. */
export const VERT_NAMES: Readonly<Record<Archetype, VertMeta>> = Object.freeze({
	introvert: { name: 'Introvert', label: 'inward, charged by quiet' },
	extrovert: { name: 'Extrovert', label: 'outward, charged by people' },
	ambivert: { name: 'Ambivert', label: 'context-flexible, mid-range' },
	omnivert: { name: 'Omnivert', label: 'oscillates between extremes' },
	otrovert: { name: 'Otrovert', label: 'belongs without belonging' }
});

/** Stable display order: introvert → extrovert → ambivert → omnivert → otrovert. */
export const VERT_ORDER: readonly Archetype[] = [
	'introvert',
	'extrovert',
	'ambivert',
	'omnivert',
	'otrovert'
];
