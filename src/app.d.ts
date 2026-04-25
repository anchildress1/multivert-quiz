// See https://svelte.dev/docs/kit/types#app
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: Record<string, unknown>;
			context?: { waitUntil(promise: Promise<unknown>): void };
			caches?: CacheStorage & { default: Cache };
		}
	}
}

export {};
