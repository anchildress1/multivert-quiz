// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChapterIntro from './ChapterIntro.svelte';

const baseProps = {
	id: 'chapter-energy',
	numeral: 'I' as const,
	title: 'Energy',
	archetype: 'introvert' as const,
	description: 'How casual settings actually feel.',
	total: 10,
	answered: 3
};

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

beforeEach(() => {
	// ChapterIntro mounts a ThemeToggle which reads localStorage + matchMedia.
	vi.stubGlobal('localStorage', fakeStorage());
	vi.stubGlobal(
		'matchMedia',
		() =>
			({
				matches: false,
				media: '(prefers-color-scheme: dark)',
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {},
				dispatchEvent: () => true
			}) as unknown as MediaQueryList
	);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('ChapterIntro — header rendering', () => {
	it('renders the numeral, title, archetype data-attribute, and description', () => {
		const { container } = render(ChapterIntro, { props: baseProps });
		const head = container.querySelector('.chapter-head') as HTMLElement;
		expect(head).not.toBeNull();
		expect(head.getAttribute('data-archetype')).toBe('introvert');
		expect(container.querySelector('.chapter-head__numeral')?.textContent).toBe('I');
		expect(container.querySelector('.chapter-head__title')?.textContent?.trim()).toBe('Energy');
		expect(container.querySelector('.chapter-head__description')?.textContent).toBe(
			baseProps.description
		);
	});

	it('forwards the id to the title element so #chapter-X anchors work', () => {
		const { container } = render(ChapterIntro, { props: baseProps });
		const title = container.querySelector('.chapter-head__title');
		expect(title?.getAttribute('id')).toBe('chapter-energy');
	});

	it('mounts a single ThemeToggle button inside the chapter head', () => {
		const { container } = render(ChapterIntro, { props: baseProps });
		const toggles = container.querySelectorAll('button.toggle');
		expect(toggles.length).toBe(1);
	});
});

describe('ChapterIntro — progress contract', () => {
	it('writes the ARIA progressbar contract: valuenow, valuemax, and valuetext', () => {
		const { container } = render(ChapterIntro, { props: { ...baseProps, answered: 7, total: 10 } });
		const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
		expect(bar).not.toBeNull();
		expect(bar.getAttribute('aria-valuemin')).toBe('0');
		expect(bar.getAttribute('aria-valuemax')).toBe('10');
		expect(bar.getAttribute('aria-valuenow')).toBe('7');
		expect(bar.getAttribute('aria-valuetext')).toBe('7 of 10 answered (70%)');
	});

	it('renders 0% when nothing is answered', () => {
		const { container } = render(ChapterIntro, { props: { ...baseProps, answered: 0, total: 10 } });
		const fill = container.querySelector('.chapter-head__progress-fill') as HTMLElement;
		expect(fill.style.width).toBe('0%');
		expect(container.querySelector('.chapter-head__progress-pct')?.textContent).toBe('0%');
	});

	it('renders 100% when fully answered', () => {
		const { container } = render(ChapterIntro, {
			props: { ...baseProps, answered: 10, total: 10 }
		});
		const fill = container.querySelector('.chapter-head__progress-fill') as HTMLElement;
		expect(fill.style.width).toBe('100%');
		expect(container.querySelector('.chapter-head__progress-pct')?.textContent).toBe('100%');
	});

	it('clamps to 0% when total is 0 (avoids NaN width)', () => {
		const { container } = render(ChapterIntro, { props: { ...baseProps, answered: 0, total: 0 } });
		const fill = container.querySelector('.chapter-head__progress-fill') as HTMLElement;
		expect(fill.style.width).toBe('0%');
	});

	it('clamps overflow to 100% when answered exceeds total (defensive)', () => {
		// Should never happen in practice, but the prop is plain `number`.
		const { container } = render(ChapterIntro, {
			props: { ...baseProps, answered: 12, total: 10 }
		});
		const fill = container.querySelector('.chapter-head__progress-fill') as HTMLElement;
		expect(fill.style.width).toBe('100%');
	});

	it('clamps negative answered to 0% (defensive)', () => {
		const { container } = render(ChapterIntro, {
			props: { ...baseProps, answered: -2, total: 10 }
		});
		const fill = container.querySelector('.chapter-head__progress-fill') as HTMLElement;
		expect(fill.style.width).toBe('0%');
	});

	it('keeps the ARIA contract intact on overflow (valuenow ≤ valuemax)', () => {
		const { container } = render(ChapterIntro, {
			props: { ...baseProps, answered: 12, total: 10 }
		});
		const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
		expect(bar.getAttribute('aria-valuemax')).toBe('10');
		expect(bar.getAttribute('aria-valuenow')).toBe('10');
		expect(bar.getAttribute('aria-valuetext')).toBe('10 of 10 answered (100%)');
	});

	it('keeps the ARIA contract intact on negative answered (valuenow ≥ 0)', () => {
		const { container } = render(ChapterIntro, {
			props: { ...baseProps, answered: -2, total: 10 }
		});
		const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
		expect(bar.getAttribute('aria-valuenow')).toBe('0');
		expect(bar.getAttribute('aria-valuetext')).toBe('0 of 10 answered (0%)');
	});

	it('keeps the ARIA contract intact when total is negative (valuemax ≥ 0)', () => {
		const { container } = render(ChapterIntro, {
			props: { ...baseProps, answered: 0, total: -3 }
		});
		const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
		expect(bar.getAttribute('aria-valuemax')).toBe('0');
		expect(bar.getAttribute('aria-valuenow')).toBe('0');
	});
});
