import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'multivert:theme';
const VALID_THEMES: readonly Theme[] = ['light', 'dark', 'system'];
const CYCLE_ORDER: readonly Theme[] = ['light', 'dark', 'system'];

const isTheme = (value: unknown): value is Theme =>
	typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);

const readStoredTheme = (): Theme => {
	if (!browser) return 'system';
	try {
		const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
		return isTheme(saved) ? saved : 'system';
	} catch (err) {
		console.warn('[theme] read failed:', (err as Error).name);
		return 'system';
	}
};

const persistTheme = (theme: Theme): void => {
	if (!browser) return;
	try {
		const storage = globalThis.localStorage;
		if (!storage) return;
		if (theme === 'system') storage.removeItem(STORAGE_KEY);
		else storage.setItem(STORAGE_KEY, theme);
	} catch (err) {
		console.warn('[theme] persist failed:', (err as Error).name);
	}
};

const readSystemDark = (): boolean =>
	browser && (globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false);

class ThemeStore {
	current = $state<Theme>(readStoredTheme());
	systemDark = $state<boolean>(readSystemDark());

	resolved = $derived.by<'light' | 'dark'>(() => {
		if (this.current !== 'system') return this.current;
		return this.systemDark ? 'dark' : 'light';
	});

	apply(next: Theme): void {
		this.current = next;
		if (!browser) return;
		const root = document.documentElement;
		if (next === 'system') delete root.dataset.theme;
		else root.dataset.theme = next;
		persistTheme(next);
	}

	cycle(): void {
		const idx = CYCLE_ORDER.indexOf(this.current);
		const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length] ?? 'system';
		this.apply(next);
	}

	/** Wire system-dark listener; returns cleanup. Caller owns the lifecycle. */
	subscribeSystem(): () => void {
		if (!browser) return () => {};
		const mql = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
		if (!mql) return () => {};
		this.systemDark = mql.matches;
		const onChange = (event: MediaQueryListEvent) => {
			this.systemDark = event.matches;
		};
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	}
}

export const themeStore = new ThemeStore();
