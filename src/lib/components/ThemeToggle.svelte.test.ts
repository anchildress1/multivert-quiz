// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { themeStore } from '$lib/state/theme.svelte';
import ThemeToggle from './ThemeToggle.svelte';

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
	vi.stubGlobal(
		'matchMedia',
		() =>
			({
				matches,
				media: '(prefers-color-scheme: dark)',
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {},
				dispatchEvent: () => true
			}) as unknown as MediaQueryList
	);
};

describe('ThemeToggle', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		delete document.documentElement.dataset.theme;
		vi.stubGlobal('localStorage', fakeStorage());
		stubMatchMedia(false);
		// Reset the shared singleton between tests since it survives across cases.
		themeStore.apply('system');
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		delete document.documentElement.dataset.theme;
	});

	it('renders a single toggle button labelled with the current state', () => {
		const { container } = render(ThemeToggle);
		const button = container.querySelector('button.toggle') as HTMLButtonElement;
		expect(button).not.toBeNull();
		expect(button.getAttribute('aria-label')).toContain('Theme:');
		expect(button.dataset.themeState).toBe('system');
	});

	it('cycles system → light → dark → system on successive clicks', async () => {
		const { container } = render(ThemeToggle);
		const button = container.querySelector('button.toggle') as HTMLButtonElement;

		await fireEvent.click(button);
		expect(button.dataset.themeState).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');

		await fireEvent.click(button);
		expect(button.dataset.themeState).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');

		await fireEvent.click(button);
		expect(button.dataset.themeState).toBe('system');
		expect(document.documentElement.dataset.theme).toBeUndefined();
	});

	it('persists explicit choice and clears storage on system', async () => {
		const store = fakeStorage();
		vi.stubGlobal('localStorage', store);
		const { container } = render(ThemeToggle);
		const button = container.querySelector('button.toggle') as HTMLButtonElement;

		await fireEvent.click(button); // light
		expect(store.getItem(STORAGE_KEY)).toBe('light');
		await fireEvent.click(button); // dark
		expect(store.getItem(STORAGE_KEY)).toBe('dark');
		await fireEvent.click(button); // system
		expect(store.getItem(STORAGE_KEY)).toBeNull();
	});

	it('two toggles in the DOM stay in sync via the shared store', async () => {
		const a = render(ThemeToggle);
		const b = render(ThemeToggle);
		const buttonA = a.container.querySelector('button.toggle') as HTMLButtonElement;
		const buttonB = b.container.querySelector('button.toggle') as HTMLButtonElement;

		await fireEvent.click(buttonA);
		expect(buttonA.dataset.themeState).toBe('light');
		expect(buttonB.dataset.themeState).toBe('light');

		await fireEvent.click(buttonB);
		expect(buttonA.dataset.themeState).toBe('dark');
		expect(buttonB.dataset.themeState).toBe('dark');
	});

	it('reflects the resolved scheme as data-resolved', async () => {
		const { container } = render(ThemeToggle);
		const button = container.querySelector('button.toggle') as HTMLButtonElement;
		expect(button.dataset.resolved).toBe('light');

		await fireEvent.click(button); // light
		expect(button.dataset.resolved).toBe('light');
		await fireEvent.click(button); // dark
		expect(button.dataset.resolved).toBe('dark');
	});
});
