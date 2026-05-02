// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, VERT_NAMES, type Archetype } from '$lib/archetypes';
import { descriptions } from '$lib/descriptions';
import VertSheet from './VertSheet.svelte';

afterEach(cleanup);

const renderSheet = (overrides: { archetype?: Archetype | null; onclose?: () => void } = {}) => {
	const onclose = overrides.onclose ?? vi.fn();
	const result = render(VertSheet, {
		props: {
			// `null` means closed; explicit so a missing key doesn't coalesce to
			// the default `'introvert'` and accidentally render the open state.
			archetype: 'archetype' in overrides ? (overrides.archetype ?? null) : 'introvert',
			onclose
		}
	});
	return { ...result, onclose };
};

describe('VertSheet — render gating', () => {
	it('renders nothing when archetype=null', () => {
		const { container } = renderSheet({ archetype: null });
		expect(container.querySelector('[role="dialog"]')).toBeNull();
	});

	it('renders the dialog when archetype is set', () => {
		const { container } = renderSheet();
		const dialog = container.querySelector('[role="dialog"]');
		expect(dialog).not.toBeNull();
		expect(dialog?.getAttribute('aria-modal')).toBe('true');
		expect(dialog?.getAttribute('aria-labelledby')).toBe('vert-sheet-title');
	});
});

describe('VertSheet — field-guide content', () => {
	it.each(ARCHETYPES)('renders the title for %s', (archetype) => {
		const { container } = renderSheet({ archetype });
		const text = container.textContent ?? '';
		// Banner is the archetype name + tagline; body jumps into the field-guide.
		expect(text).toContain(VERT_NAMES[archetype].name.toUpperCase());
		expect(text).toContain(VERT_NAMES[archetype].label);
	});

	it.each(ARCHETYPES)('renders the day-in-the-life vignette for %s', (archetype) => {
		const { container } = renderSheet({ archetype });
		const day = container.querySelector('.sheet__day-text');
		expect(day).not.toBeNull();
		// Stable substring pin so a copy revert is caught here, not just by shape.
		const expectedFragment = descriptions[archetype].deep.dayInTheLife.slice(0, 40);
		expect(day?.textContent).toContain(expectedFragment);
	});

	it.each(ARCHETYPES)('renders all five trueThings for %s as a numbered list', (archetype) => {
		const { container } = renderSheet({ archetype });
		const items = container.querySelectorAll('.sheet__truth');
		expect(items.length).toBe(descriptions[archetype].deep.trueThings.length);
		expect(items.length).toBe(5);
	});

	it.each(ARCHETYPES)('renders the giveaways for %s', (archetype) => {
		const { container } = renderSheet({ archetype });
		const tells = container.querySelectorAll('.sheet__giveaway');
		expect(tells.length).toBe(descriptions[archetype].deep.giveaways.length);
	});

	it.each(ARCHETYPES)('renders whatHelps and whatKillsYou definitions for %s', (archetype) => {
		const { container } = renderSheet({ archetype });
		const text = container.textContent ?? '';
		expect(text).toContain(descriptions[archetype].deep.whatHelps);
		expect(text).toContain(descriptions[archetype].deep.whatKillsYou);
	});

	it.each(ARCHETYPES)('renders the closing pull-quote for %s', (archetype) => {
		const { container } = renderSheet({ archetype });
		const pull = container.querySelector('.sheet__pull-text');
		expect(pull).not.toBeNull();
		expect(pull?.textContent?.trim()).toBe(descriptions[archetype].deep.youllNeverAdmit);
	});

	it('does not render a `.sheet__credits` "receipts" block', () => {
		// The field-guide structure has no sources/receipts roll — pin its absence.
		const { container } = renderSheet();
		expect(container.querySelector('.sheet__credits')).toBeNull();
		expect(container.textContent ?? '').not.toMatch(/the receipts/i);
	});

	it('writes the archetype to data-archetype on the dialog', () => {
		const { container } = renderSheet({ archetype: 'otrovert' });
		const dialog = container.querySelector('[role="dialog"]');
		expect((dialog as HTMLElement | null)?.dataset.archetype).toBe('otrovert');
	});
});

describe('VertSheet — dismissal', () => {
	it('invokes onclose when the close button is clicked', async () => {
		const { container, onclose } = renderSheet();
		const close = container.querySelector('.sheet__close') as HTMLButtonElement;
		expect(close).not.toBeNull();
		await fireEvent.click(close);
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('invokes onclose when the scrim is clicked', async () => {
		const { container, onclose } = renderSheet();
		const scrim = container.querySelector('.sheet__scrim') as HTMLElement;
		expect(scrim).not.toBeNull();
		await fireEvent.click(scrim);
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('invokes onclose on Escape', async () => {
		const onclose = vi.fn();
		renderSheet({ onclose });
		await fireEvent.keyDown(document, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('does not invoke onclose on Escape when archetype is null', async () => {
		const onclose = vi.fn();
		renderSheet({ archetype: null, onclose });
		await fireEvent.keyDown(document, { key: 'Escape' });
		expect(onclose).not.toHaveBeenCalled();
	});

	it('does not bind a touchend dismissal on the scrim (mobile-scroll false-positive)', () => {
		const { container } = renderSheet();
		const scrim = container.querySelector('.sheet__scrim') as HTMLElement;
		expect(scrim).not.toBeNull();
		// `click` is the only dismissal channel — `touchend` would fire after a
		// scroll-then-release on iOS/Android and close the sheet by accident.
		expect(scrim.outerHTML).not.toContain('touchend');
	});

	it('does not invoke onclose on unrelated keys', async () => {
		const onclose = vi.fn();
		renderSheet({ onclose });
		await fireEvent.keyDown(document, { key: 'a' });
		expect(onclose).not.toHaveBeenCalled();
	});
});

describe('VertSheet — body scroll lock', () => {
	it('sets and restores body overflow on open/close', async () => {
		const original = document.body.style.overflow;
		expect(original).toBe('');
		const { unmount } = renderSheet();
		expect(document.body.style.overflow).toBe('hidden');
		unmount();
		expect(document.body.style.overflow).toBe(original);
	});
});
