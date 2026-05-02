// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, VERT_NAMES, type Archetype } from '$lib/archetypes';
import { descriptions } from '$lib/descriptions';
import VertSheet from './VertSheet.svelte';

afterEach(cleanup);

const renderSheet = (
	overrides: { open?: boolean; archetype?: Archetype | null; onclose?: () => void } = {}
) => {
	const onclose = overrides.onclose ?? vi.fn();
	const result = render(VertSheet, {
		props: {
			open: overrides.open ?? true,
			// `null` is a valid intent ("sheet is closed because no archetype is
			// selected"), so don't coalesce it away with `??`.
			archetype: 'archetype' in overrides ? (overrides.archetype ?? null) : 'introvert',
			onclose
		}
	});
	return { ...result, onclose };
};

describe('VertSheet — render gating', () => {
	it('renders nothing when open=false', () => {
		const { container } = renderSheet({ open: false });
		expect(container.querySelector('[role="dialog"]')).toBeNull();
	});

	it('renders nothing when archetype=null', () => {
		const { container } = renderSheet({ archetype: null });
		expect(container.querySelector('[role="dialog"]')).toBeNull();
	});

	it('renders the dialog when open=true with an archetype', () => {
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
		// Banner carries the archetype TITLE (uppercase) + tagline; the body
		// of the sheet jumps directly into the deeper field-guide content.
		// The headline + body lede that used to repeat under the title was
		// removed so the sheet does not restate what the swatch already said.
		expect(text).toContain(VERT_NAMES[archetype].name.toUpperCase());
		expect(text).toContain(VERT_NAMES[archetype].label);
	});

	it.each(ARCHETYPES)('renders the day-in-the-life vignette for %s', (archetype) => {
		const { container } = renderSheet({ archetype });
		const day = container.querySelector('.sheet__day-text');
		expect(day).not.toBeNull();
		// Pin a stable substring from each vignette so a future copy revert is
		// caught here, not just by the data-shape test next to it.
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

	it('does not render an encyclopedia "sources/receipts" credits roll', () => {
		// Regression pin: the v2 layout had a `.sheet__credits` block with a
		// "The receipts" label. The field-guide rewrite drops it — make sure
		// nobody walks it back in.
		const { container } = renderSheet();
		expect(container.querySelector('.sheet__credits')).toBeNull();
		expect(container.textContent ?? '').not.toMatch(/the receipts/i);
	});

	it('writes the archetype to data-archetype on the dialog', () => {
		const { container } = renderSheet({ archetype: 'otrovert' });
		const dialog = container.querySelector('[role="dialog"]');
		expect(dialog?.getAttribute('data-archetype')).toBe('otrovert');
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
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('does not invoke onclose on Escape when closed', async () => {
		const onclose = vi.fn();
		renderSheet({ open: false, onclose });
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(onclose).not.toHaveBeenCalled();
	});

	it('does not invoke onclose on unrelated keys', async () => {
		const onclose = vi.fn();
		renderSheet({ onclose });
		await fireEvent.keyDown(window, { key: 'a' });
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
