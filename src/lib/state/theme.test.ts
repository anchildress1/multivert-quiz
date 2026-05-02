// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'multivert:theme';

const fakeStorage = (): Storage => {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key) => map.get(key) ?? null,
		key: (index) => Array.from(map.keys())[index] ?? null,
		removeItem: (key) => {
			map.delete(key);
		},
		setItem: (key, value) => {
			map.set(key, value);
		}
	};
};

const stubMatchMedia = (matches: boolean) => {
	const listeners = new Set<(e: MediaQueryListEvent) => void>();
	const mql = {
		matches,
		media: '(prefers-color-scheme: dark)',
		onchange: null,
		addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
			listeners.add(fn);
		},
		removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
			listeners.delete(fn);
		},
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn()
	} as unknown as MediaQueryList;
	vi.stubGlobal('matchMedia', () => mql);
	return {
		mql,
		flip: (next: boolean) => {
			(mql as { matches: boolean }).matches = next;
			for (const fn of listeners) fn({ matches: next } as MediaQueryListEvent);
		}
	};
};

describe('themeStore — initialization (browser, localStorage seeded)', () => {
	afterEach(() => {
		vi.resetModules();
		vi.unstubAllGlobals();
		delete document.documentElement.dataset.theme;
	});

	it('reads a saved "light" preference on import', async () => {
		const store = fakeStorage();
		store.setItem(STORAGE_KEY, 'light');
		vi.stubGlobal('localStorage', store);
		stubMatchMedia(false);
		const { themeStore } = await import('./theme.svelte');
		expect(themeStore.current).toBe('light');
	});

	it('reads a saved "dark" preference on import', async () => {
		const store = fakeStorage();
		store.setItem(STORAGE_KEY, 'dark');
		vi.stubGlobal('localStorage', store);
		stubMatchMedia(true);
		const { themeStore } = await import('./theme.svelte');
		expect(themeStore.current).toBe('dark');
	});

	it('falls back to "system" when localStorage holds a bogus value', async () => {
		const store = fakeStorage();
		store.setItem(STORAGE_KEY, 'auto');
		vi.stubGlobal('localStorage', store);
		stubMatchMedia(false);
		const { themeStore } = await import('./theme.svelte');
		expect(themeStore.current).toBe('system');
	});

	it('falls back to "system" when localStorage.getItem throws', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new DOMException('blocked', 'SecurityError');
			},
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
			key: () => null,
			length: 0
		} as Storage);
		stubMatchMedia(false);
		const { themeStore } = await import('./theme.svelte');
		expect(themeStore.current).toBe('system');
		expect(warn).toHaveBeenCalledWith('[theme] read failed:', 'SecurityError');
	});
});

describe('themeStore — apply / cycle / persistence', () => {
	let store: Storage;

	beforeEach(async () => {
		vi.resetModules();
		vi.unstubAllGlobals();
		delete document.documentElement.dataset.theme;
		store = fakeStorage();
		vi.stubGlobal('localStorage', store);
		stubMatchMedia(false);
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('system');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		delete document.documentElement.dataset.theme;
	});

	it('apply("light") writes data-theme + persists', async () => {
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('light');
		expect(themeStore.current).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');
		expect(store.getItem(STORAGE_KEY)).toBe('light');
	});

	it('apply("dark") writes data-theme + persists', async () => {
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('dark');
		expect(themeStore.current).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(store.getItem(STORAGE_KEY)).toBe('dark');
	});

	it('apply("system") removes data-theme + clears storage', async () => {
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('dark');
		themeStore.apply('system');
		expect(themeStore.current).toBe('system');
		expect(document.documentElement.dataset.theme).toBeUndefined();
		expect(store.getItem(STORAGE_KEY)).toBeNull();
	});

	it('cycle rotates light → dark → system → light', async () => {
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('light');
		themeStore.cycle();
		expect(themeStore.current).toBe('dark');
		themeStore.cycle();
		expect(themeStore.current).toBe('system');
		themeStore.cycle();
		expect(themeStore.current).toBe('light');
	});

	it('swallows persist failures and keeps in-memory state', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubGlobal('localStorage', {
			getItem: () => null,
			setItem: () => {
				throw new DOMException('quota', 'QuotaExceededError');
			},
			removeItem: () => {},
			clear: () => {},
			key: () => null,
			length: 0
		} as Storage);
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('dark');
		expect(themeStore.current).toBe('dark');
		expect(warn).toHaveBeenCalledWith('[theme] persist failed:', 'QuotaExceededError');
	});
});

describe('themeStore — resolved + subscribeSystem', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.unstubAllGlobals();
		delete document.documentElement.dataset.theme;
		vi.stubGlobal('localStorage', fakeStorage());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		delete document.documentElement.dataset.theme;
	});

	it('resolves to itself for explicit light/dark', async () => {
		stubMatchMedia(true);
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('light');
		expect(themeStore.resolved).toBe('light');
		themeStore.apply('dark');
		expect(themeStore.resolved).toBe('dark');
	});

	it('resolves system → dark when prefers-color-scheme: dark', async () => {
		stubMatchMedia(true);
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('system');
		themeStore.subscribeSystem();
		expect(themeStore.resolved).toBe('dark');
	});

	it('subscribeSystem updates resolved when OS theme flips', async () => {
		const mql = stubMatchMedia(false);
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('system');
		const cleanup = themeStore.subscribeSystem();
		expect(themeStore.resolved).toBe('light');
		mql.flip(true);
		expect(themeStore.resolved).toBe('dark');
		cleanup();
		// After cleanup, further OS flips do not propagate.
		mql.flip(false);
		expect(themeStore.resolved).toBe('dark');
	});

	it('subscribeSystem returns a no-op cleanup when matchMedia is missing', async () => {
		vi.stubGlobal('matchMedia', undefined);
		const { themeStore } = await import('./theme.svelte');
		const cleanup = themeStore.subscribeSystem();
		expect(typeof cleanup).toBe('function');
		expect(() => cleanup()).not.toThrow();
	});
});

describe('themeStore — SSR (browser=false)', () => {
	afterEach(() => {
		vi.resetModules();
		vi.unstubAllGlobals();
		vi.doUnmock('$app/environment');
	});

	it('initializes to "system" without touching localStorage', async () => {
		vi.resetModules();
		vi.doMock('$app/environment', () => ({ browser: false }));
		const getItem = vi.fn(() => 'dark');
		vi.stubGlobal('localStorage', {
			getItem,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
			key: () => null,
			length: 0
		} as Storage);
		const { themeStore } = await import('./theme.svelte');
		expect(themeStore.current).toBe('system');
		expect(getItem).not.toHaveBeenCalled();
	});

	it('apply does not write to localStorage when not in the browser', async () => {
		vi.resetModules();
		vi.doMock('$app/environment', () => ({ browser: false }));
		const setItem = vi.fn();
		vi.stubGlobal('localStorage', {
			getItem: () => null,
			setItem,
			removeItem: () => {},
			clear: () => {},
			key: () => null,
			length: 0
		} as Storage);
		const { themeStore } = await import('./theme.svelte');
		themeStore.apply('dark');
		expect(themeStore.current).toBe('dark');
		expect(setItem).not.toHaveBeenCalled();
	});
});
