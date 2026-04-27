/**
 * Display-side metadata. Kept as a thin re-export of the canonical archetype
 * registry so existing `import { VERT_NAMES, VERT_ORDER } from '$lib/types'`
 * call-sites keep working — but new code should import from $lib/archetypes
 * directly.
 */

export { VERT_NAMES, VERT_ORDER, type Archetype, type VertMeta } from './archetypes';
