<script lang="ts">
	import { browser } from '$app/environment';

	type Theme = 'light' | 'dark' | 'system';

	const STORAGE_KEY = 'multivert:theme';

	let theme = $state<Theme>('system');

	/* Read the persisted choice on mount. The `app.html` head script (added
	   alongside this component) sets `data-theme` before paint to avoid a
	   light-flash when the saved choice is dark. Here we just sync the
	   button's reactive state to the value the head script already wrote. */
	$effect(() => {
		if (!browser) return;
		const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
		if (saved === 'light' || saved === 'dark') {
			theme = saved;
		} else {
			theme = 'system';
		}
	});

	/* Resolved scheme is what the user *sees* — needed because `system` has
	   to inspect `prefers-color-scheme` to decide which glyph to show. The
	   matchMedia listener keeps the glyph honest if the OS theme flips while
	   the page is open and the user hasn't overridden. */
	let systemDark = $state(false);
	$effect(() => {
		if (!browser) return;
		const mql = globalThis.matchMedia('(prefers-color-scheme: dark)');
		systemDark = mql.matches;
		const onChange = (event: MediaQueryListEvent) => {
			systemDark = event.matches;
		};
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	});

	const resolved = $derived<'light' | 'dark'>(
		theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
	);

	function apply(next: Theme) {
		theme = next;
		if (!browser) return;
		const root = document.documentElement;
		if (next === 'system') {
			root.removeAttribute('data-theme');
			localStorage.removeItem(STORAGE_KEY);
		} else {
			root.setAttribute('data-theme', next);
			localStorage.setItem(STORAGE_KEY, next);
		}
	}

	/* Single button cycles light → dark → system → light. Three states
	   instead of two so the user can opt back into following their OS
	   without clearing storage manually. */
	function cycle() {
		const order: Theme[] = ['light', 'dark', 'system'];
		const next = order[(order.indexOf(theme) + 1) % order.length] ?? 'system';
		apply(next);
	}

	const labelMap: Record<Theme, string> = {
		light: 'Theme: light. Click to switch to dark.',
		dark: 'Theme: dark. Click to follow system.',
		system: 'Theme: follows system. Click to switch to light.'
	};
</script>

<button
	type="button"
	class="toggle"
	data-theme-state={theme}
	data-resolved={resolved}
	aria-label={labelMap[theme]}
	title={labelMap[theme]}
	onclick={cycle}
>
	<!-- Three glyphs, only one visible per state. CSS opacity-swaps them
	     so the button width never jitters between modes. -->
	<svg
		class="toggle__glyph toggle__glyph--sun"
		viewBox="0 0 24 24"
		aria-hidden="true"
		focusable="false"
	>
		<circle cx="12" cy="12" r="4" fill="currentColor" />
		<g stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
			<line x1="12" y1="2.5" x2="12" y2="5" />
			<line x1="12" y1="19" x2="12" y2="21.5" />
			<line x1="2.5" y1="12" x2="5" y2="12" />
			<line x1="19" y1="12" x2="21.5" y2="12" />
			<line x1="5.2" y1="5.2" x2="6.9" y2="6.9" />
			<line x1="17.1" y1="17.1" x2="18.8" y2="18.8" />
			<line x1="5.2" y1="18.8" x2="6.9" y2="17.1" />
			<line x1="17.1" y1="6.9" x2="18.8" y2="5.2" />
		</g>
	</svg>
	<svg
		class="toggle__glyph toggle__glyph--moon"
		viewBox="0 0 24 24"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z" fill="currentColor" />
	</svg>
	<svg
		class="toggle__glyph toggle__glyph--system"
		viewBox="0 0 24 24"
		aria-hidden="true"
		focusable="false"
	>
		<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6" />
		<path d="M12 4.5a7.5 7.5 0 0 0 0 15z" fill="currentColor" />
	</svg>
	<span class="toggle__sr">{labelMap[theme]}</span>
</button>

<style>
	.toggle {
		--toggle-size: 2.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		position: relative;
		width: var(--toggle-size);
		height: var(--toggle-size);
		padding: 0;
		background: transparent;
		border: 0.0625rem solid color-mix(in oklab, var(--ink) 12%, transparent);
		border-radius: 99rem;
		color: var(--ink-70);
		cursor: pointer;
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			background 0.2s ease,
			transform 0.2s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.toggle:hover {
		color: var(--ink);
		border-color: color-mix(in oklab, var(--ink) 24%, transparent);
		background: color-mix(in oklab, var(--ink) 4%, transparent);
	}

	.toggle:active {
		transform: scale(0.96);
	}

	.toggle:focus-visible {
		outline: 0.125rem solid var(--ink);
		outline-offset: 0.1875rem;
	}

	.toggle__glyph {
		position: absolute;
		width: 1.125rem;
		height: 1.125rem;
		opacity: 0;
		transform: rotate(-30deg) scale(0.6);
		transition:
			opacity 0.25s ease,
			transform 0.3s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.toggle[data-theme-state='light'] .toggle__glyph--sun,
	.toggle[data-theme-state='dark'] .toggle__glyph--moon,
	.toggle[data-theme-state='system'] .toggle__glyph--system {
		opacity: 1;
		transform: none;
	}

	.toggle__sr {
		position: absolute;
		clip: rect(1px, 1px, 1px, 1px);
		clip-path: inset(50%);
		width: 1px;
		height: 1px;
		overflow: hidden;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.toggle,
		.toggle__glyph {
			transition: none;
		}
	}
</style>
