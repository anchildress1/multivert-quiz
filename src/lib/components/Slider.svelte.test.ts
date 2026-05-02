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

describe('Slider — handlePointerup (drag-back-to-start commit)', () => {
	const flushTimers = () => new Promise((resolve) => setTimeout(resolve, 0));

	it('commits answered on pointerup when input fired but change did not', async () => {
		const { input, onchange } = renderSlider({ value: null, phase: 'unset' });
		// User taps at non-zero, drags back to 0, releases — native `change`
		// never fires because the final value matches the start value.
		fireEvent.input(input, { target: { value: '0.5' } });
		fireEvent.input(input, { target: { value: '0' } });
		onchange.mockClear();
		fireEvent.pointerUp(input);
		await flushTimers();
		expect(onchange).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledWith({ value: 0, state: 'answered' });
	});

	it('does not double-commit when change fires after pointerup', async () => {
		const { input, onchange } = renderSlider({ value: null, phase: 'unset' });
		fireEvent.input(input, { target: { value: '0.5' } });
		fireEvent.pointerUp(input);
		fireEvent.change(input, { target: { value: '0.5' } });
		await flushTimers();
		expect(onchange).toHaveBeenCalledTimes(2);
		expect(onchange).toHaveBeenNthCalledWith(1, { value: 0.5, state: 'in-progress' });
		expect(onchange).toHaveBeenNthCalledWith(2, { value: 0.5, state: 'answered' });
	});

	it('does nothing on pointerup when no input has fired', async () => {
		const { input, onchange } = renderSlider({ value: 0, phase: 'unset' });
		fireEvent.pointerUp(input);
		await flushTimers();
		expect(onchange).not.toHaveBeenCalled();
	});

	it('ignores NaN values on pointerup commit', async () => {
		const { input, onchange } = renderSlider({ value: null, phase: 'unset' });
		fireEvent.input(input, { target: { value: '0.5' } });
		onchange.mockClear();
		Object.defineProperty(input, 'value', { writable: true, value: 'NaN' });
		fireEvent.pointerUp(input);
		await flushTimers();
		expect(onchange).not.toHaveBeenCalled();
	});

	it('clears pendingCommit on retake so a stale pointerup does not commit', async () => {
		const { input, rerender, onchange } = renderSlider({ value: 0.5, phase: 'in-progress' });
		fireEvent.input(input, { target: { value: '0.5' } });
		await rerender({
			id: 'test-slider',
			label: 'Test question',
			onchange,
			value: null,
			phase: 'unset'
		});
		onchange.mockClear();
		fireEvent.pointerUp(input);
		await flushTimers();
		expect(onchange).not.toHaveBeenCalled();
	});

	it('cancels the pending pointerup commit when the component unmounts mid-defer', async () => {
		const { input, onchange, unmount } = renderSlider({ value: null, phase: 'unset' });
		fireEvent.input(input, { target: { value: '0.5' } });
		fireEvent.pointerUp(input);
		// pointerup queues a 0ms setTimeout; tearing the component down BEFORE
		// the microtask drains must cancel the deferred commit so a torn-down
		// slider cannot mutate the answers store after a Start-over.
		unmount();
		onchange.mockClear();
		await flushTimers();
		expect(onchange).not.toHaveBeenCalled();
	});

	it('clears the pointerup latch on retake so an in-flight setTimeout does not fire', async () => {
		const { input, rerender, onchange } = renderSlider({ value: null, phase: 'in-progress' });
		fireEvent.input(input, { target: { value: '0.5' } });
		fireEvent.pointerUp(input);
		// Phase flips back to unset (Start over) before the deferred commit drains.
		await rerender({
			id: 'test-slider',
			label: 'Test question',
			onchange,
			value: null,
			phase: 'unset'
		});
		onchange.mockClear();
		await flushTimers();
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
