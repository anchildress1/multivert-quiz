// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Slider from './Slider.svelte';

afterEach(cleanup);

const renderSlider = (overrides: Record<string, unknown> = {}) => {
	const onchange = vi.fn();
	const result = render(Slider, {
		props: { id: 'test-slider', label: 'Test question', onchange, ...overrides }
	});
	const input = result.container.querySelector('input[type="range"]') as HTMLInputElement;
	return { ...result, input, onchange };
};

describe('Slider — handleInput / handleChange', () => {
	it('emits in-progress on input event', () => {
		const { input, onchange } = renderSlider();
		fireEvent.input(input, { target: { value: '0.5' } });
		expect(onchange).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledWith({ value: 0.5, state: 'in-progress' });
	});

	it('emits answered on change event', () => {
		const { input, onchange } = renderSlider();
		fireEvent.change(input, { target: { value: '-0.5' } });
		expect(onchange).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledWith({ value: -0.5, state: 'answered' });
	});

	it('ignores NaN values from input event', () => {
		const { input, onchange } = renderSlider();
		// Simulate an event where value can't be parsed to a finite number.
		Object.defineProperty(input, 'value', { writable: true, value: 'NaN' });
		fireEvent.input(input);
		expect(onchange).not.toHaveBeenCalled();
	});
});

describe('Slider — handleClick (neutral-commit latch)', () => {
	it('commits answered on click when hasInteracted is false', () => {
		const { input, onchange } = renderSlider({ value: 0, phase: 'unset' });
		fireEvent.click(input);
		expect(onchange).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledWith(expect.objectContaining({ state: 'answered' }));
	});

	it('does not double-commit on click after prior interaction', () => {
		const { input, onchange } = renderSlider({ value: 0.5, phase: 'in-progress' });
		// First interaction via input event sets hasInteracted = true.
		fireEvent.input(input, { target: { value: '0.5' } });
		onchange.mockClear();
		fireEvent.click(input);
		expect(onchange).not.toHaveBeenCalled();
	});
});

describe('Slider — handleKeydown (keyboard neutral-commit)', () => {
	it('commits answered on Enter when hasInteracted is false', () => {
		const { input, onchange } = renderSlider({ value: 0, phase: 'unset' });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onchange).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledWith(expect.objectContaining({ state: 'answered' }));
	});

	it('commits answered on Space when hasInteracted is false', () => {
		const { input, onchange } = renderSlider({ value: 0, phase: 'unset' });
		fireEvent.keyDown(input, { key: ' ' });
		expect(onchange).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledWith(expect.objectContaining({ state: 'answered' }));
	});

	it('does not commit on Enter after prior interaction', () => {
		const { input, onchange } = renderSlider({ value: 0.5, phase: 'in-progress' });
		fireEvent.input(input, { target: { value: '0.5' } });
		onchange.mockClear();
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onchange).not.toHaveBeenCalled();
	});

	it('does not commit on unrelated keys', () => {
		const { input, onchange } = renderSlider({ value: 0, phase: 'unset' });
		fireEvent.keyDown(input, { key: 'ArrowRight' });
		expect(onchange).not.toHaveBeenCalled();
	});
});

describe('Slider — handleFocus', () => {
	it('emits in-progress on focus when phase is unset and value is non-null', () => {
		const { input, onchange } = renderSlider({ value: 0.3, phase: 'unset' });
		fireEvent.focus(input);
		expect(onchange).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledWith({ value: 0.3, state: 'in-progress' });
	});

	it('does not emit on focus when phase is unset and value is null', () => {
		const { input, onchange } = renderSlider({ value: null, phase: 'unset' });
		fireEvent.focus(input);
		expect(onchange).not.toHaveBeenCalled();
	});

	it('does not emit on focus when phase is already answered', () => {
		const { input, onchange } = renderSlider({ value: 0.5, phase: 'answered' });
		fireEvent.focus(input);
		expect(onchange).not.toHaveBeenCalled();
	});
});

describe('Slider — hasInteracted latch reset on retake', () => {
	it('re-enables neutral-click commit after phase returns to unset', async () => {
		const { input, rerender, onchange } = renderSlider({ value: 0, phase: 'answered' });

		// Interaction already happened (phase is answered — hasInteracted is true).
		onchange.mockClear();

		// Simulate a retake: update phase to 'unset', which triggers the $effect.
		await rerender({
			id: 'test-slider',
			label: 'Test question',
			onchange,
			value: null,
			phase: 'unset'
		});
		fireEvent.click(input);
		expect(onchange).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledWith(expect.objectContaining({ state: 'answered' }));
	});
});
