import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		include: ['src/**/*.test.{ts,js}', 'src/**/*.svelte.test.ts'],
		globals: false,
		environment: 'node',
		setupFiles: ['./vitest.setup.ts'],
		// Force Svelte component files to use the browser (non-SSR) transform
		// when running in a jsdom environment (per-file @vitest-environment override).
		testTransformMode: { web: [/\.svelte(\.[jt]s)?$/] },
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov', 'html'],
			reportsDirectory: './coverage',
			include: ['src/lib/**/*.ts', 'src/lib/**/*.svelte.ts'],
			exclude: ['src/lib/**/*.test.ts', 'src/lib/questions.ts', 'src/lib/types.ts'],
			thresholds: {
				lines: 85,
				functions: 85,
				statements: 85,
				branches: 80
			}
		}
	}
});
