<script lang="ts">
	import type { Archetype } from '$lib/scoring';

	export type SliderState = 'unset' | 'in-progress' | 'answered';

	interface Props {
		id: string;
		/** Either provide a label string (rendered as a visually hidden <label>),
		 *  or `labelledBy` pointing at the id of an existing visible element. */
		label?: string;
		labelledBy?: string;
		accent?: Archetype;
		value?: number | null;
		phase?: SliderState;
		onchange?: (next: { value: number; state: 'in-progress' | 'answered' }) => void;
	}

	const {
		id,
		label,
		labelledBy,
		accent = 'otrovert',
		value = null,
		phase = 'unset',
		onchange
	}: Props = $props();

	const STEP = 0.05;
	const MIN = -1;
	const MAX = 1;

	const displayValue = $derived(value ?? 0);
	const fillPercent = $derived(((displayValue - MIN) / (MAX - MIN)) * 100);
	const fillFromMid = $derived(Math.abs(fillPercent - 50));
	const fillStart = $derived(Math.min(50, fillPercent));

	// Tracks whether the user has interacted in this mounted instance. Used so
	// the click handler can commit a neutral (0) answer that the native
	// `change` event would otherwise swallow — clicking exactly at the
	// already-rendered thumb position doesn't change the input value, so
	// `input` / `change` never fire and the answer would otherwise be stuck
	// at `unset` for any user who genuinely meant to pick neutral. Plain `let`
	// (no `$state`) because it is only read inside event handlers, never in
	// the template — reactivity isn't needed.
	let hasInteracted = false;

	$effect(() => {
		// Retake/reset returns the external slider state to `unset`; clear the
		// local latch so neutral click/keyboard commit works again.
		if (phase === 'unset') hasInteracted = false;
	});

	function handleInput(event: Event) {
		if (!(event.target instanceof HTMLInputElement)) return;
		hasInteracted = true;
		const next = Number(event.target.value);
		if (!Number.isFinite(next)) return;
		onchange?.({ value: next, state: 'in-progress' });
	}

	function handleChange(event: Event) {
		if (!(event.target instanceof HTMLInputElement)) return;
		hasInteracted = true;
		const next = Number(event.target.value);
		if (!Number.isFinite(next)) return;
		onchange?.({ value: next, state: 'answered' });
	}

	function handleFocus() {
		if (phase === 'unset' && value !== null) {
			onchange?.({ value, state: 'in-progress' });
		}
	}

	function handleClick(event: MouseEvent) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return;
		// Skip if the user has already moved the slider in this session — input/
		// change have done the right thing. Only fires for the no-op-value path.
		if (hasInteracted) return;
		hasInteracted = true;
		const next = Number(event.currentTarget.value);
		if (!Number.isFinite(next)) return;
		onchange?.({ value: next, state: 'answered' });
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return;
		// Same problem on the keyboard: pressing Enter or Space on the focused
		// thumb without changing the value should still commit. Arrow keys
		// already mutate the value so they go through input/change.
		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (hasInteracted) return;
		event.preventDefault();
		hasInteracted = true;
		const next = Number(event.currentTarget.value);
		if (!Number.isFinite(next)) return;
		onchange?.({ value: next, state: 'answered' });
	}
</script>

<div class="slider" data-state={phase} style:--accent="var(--vert-{accent}-mid)">
	{#if !labelledBy && label}
		<label class="slider__sr" for={id}>{label}</label>
	{/if}

	<div class="slider__track" aria-hidden="true">
		<div class="slider__rail"></div>
		<div class="slider__center"></div>
		{#if phase !== 'unset'}
			<div
				class="slider__fill"
				style:left="{fillStart}%"
				style:width="{fillFromMid}%"
				style:background={phase === 'answered' ? 'var(--accent)' : 'var(--ink-70)'}
			></div>
		{/if}
		<div class="slider__ticks">
			{#each [0, 1, 2, 3, 4] as i (i)}
				<span class="slider__tick"></span>
			{/each}
		</div>
		{#if phase !== 'unset'}
			<div
				class="slider__thumb"
				style:left="{fillPercent}%"
				style:border-color={phase === 'answered' ? 'var(--accent)' : 'var(--ink)'}
			>
				<span
					class="slider__dot"
					style:background={phase === 'answered' ? 'var(--accent)' : 'var(--ink)'}
				></span>
			</div>
		{/if}
	</div>

	<input
		{id}
		class="slider__input"
		type="range"
		min={MIN}
		max={MAX}
		step={STEP}
		value={displayValue}
		aria-labelledby={labelledBy}
		aria-label={labelledBy ? undefined : label}
		aria-valuemin={MIN}
		aria-valuemax={MAX}
		aria-valuenow={value ?? 0}
		oninput={handleInput}
		onchange={handleChange}
		onfocus={handleFocus}
		onclick={handleClick}
		onkeydown={handleKeydown}
	/>

	<div class="slider__legend">
		<span>not at all like me</span>
		<span class="slider__legend-mid">neutral</span>
		<span>exactly like me</span>
	</div>

	{#if phase === 'unset'}
		<p class="slider__hint">tap or drag to answer</p>
	{/if}
</div>

<style>
	.slider {
		--track-h: 6px;
		--thumb-r: 22px;
		position: relative;
		width: 100%;
		max-width: 540px;
		margin-inline: auto;
		user-select: none;
	}

	.slider__sr {
		position: absolute;
		clip: rect(1px, 1px, 1px, 1px);
		clip-path: inset(50%);
		width: 1px;
		height: 1px;
		overflow: hidden;
		white-space: nowrap;
	}

	.slider__track {
		position: relative;
		height: 44px;
		display: flex;
		align-items: center;
	}

	.slider__rail {
		position: relative;
		width: 100%;
		height: var(--track-h);
		border-radius: 999px;
		background: var(--ink-08);
	}

	.slider__center {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 2px;
		height: 18px;
		margin: -9px 0 0 -1px;
		background: var(--ink-30);
	}

	.slider__fill {
		position: absolute;
		top: 50%;
		height: var(--track-h);
		margin-top: calc(var(--track-h) / -2);
		border-radius: 999px;
		transition:
			left 0.2s cubic-bezier(0.2, 0.7, 0.3, 1),
			width 0.2s cubic-bezier(0.2, 0.7, 0.3, 1),
			background 0.2s ease;
	}

	.slider__ticks {
		position: absolute;
		top: calc(50% + 14px);
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		pointer-events: none;
	}

	.slider__tick {
		width: 1px;
		height: 6px;
		background: var(--ink-12);
	}

	.slider__thumb {
		position: absolute;
		top: 50%;
		width: calc(var(--thumb-r) * 2);
		height: calc(var(--thumb-r) * 2);
		margin: calc(var(--thumb-r) * -1) 0 0 calc(var(--thumb-r) * -1);
		border-radius: 999px;
		background: var(--surface, var(--paper));
		border: 2px solid var(--ink);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
		transition:
			left 0.2s cubic-bezier(0.2, 0.7, 0.3, 1),
			border-color 0.2s ease,
			box-shadow 0.2s ease;
		pointer-events: none;
	}

	.slider[data-state='in-progress'] .slider__thumb {
		box-shadow:
			0 0 0 8px var(--ink-08),
			0 4px 14px rgba(0, 0, 0, 0.2);
	}

	.slider__dot {
		width: 4px;
		height: 4px;
		border-radius: 999px;
	}

	/* The native range input is positioned over the visual track, invisible
	   but interactive — keyboard, mouse, touch, screen reader all work. */
	.slider__input {
		position: absolute;
		inset: 0 0 auto 0;
		height: 44px;
		width: 100%;
		opacity: 0;
		cursor: pointer;
	}

	.slider__input:focus-visible + .slider__legend {
		color: var(--ink);
	}

	.slider__legend {
		margin-top: 26px;
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: var(--ink-70);
		font-family: var(--font-sans);
	}

	.slider__legend-mid {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.05em;
	}

	.slider__hint {
		margin-top: 12px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--ink-70);
		letter-spacing: 0.05em;
		text-align: center;
		text-transform: uppercase;
	}
</style>
