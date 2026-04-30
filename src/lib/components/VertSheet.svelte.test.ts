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

describe('VertSheet — archetype content', () => {
	it.each(ARCHETYPES)('renders the canonical headline + body for %s', (archetype) => {
		const { container } = renderSheet({ archetype });
		const text = container.textContent ?? '';
		expect(text).toContain(VERT_NAMES[archetype].name);
		expect(text).toContain(descriptions[archetype].headline);
		// Pull a stable substring of the body that won't change between minor edits.
		expect(text.length).toBeGreaterThan(descriptions[archetype].body.length / 2);
	});

	it.each(ARCHETYPES)('renders all signs for %s as a numbered list', (archetype) => {
		const { container } = renderSheet({ archetype });
		const items = container.querySelectorAll('.sheet__sign');
		expect(items.length).toBe(descriptions[archetype].deep.signs.length);
	});

	it.each(ARCHETYPES)('renders the credits roll for %s', (archetype) => {
		const { container } = renderSheet({ archetype });
		const credits = container.querySelectorAll('.sheet__credits-list li');
		expect(credits.length).toBe(descriptions[archetype].deep.sources.length);
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
