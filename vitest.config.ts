import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.{ts,js}', 'src/**/*.svelte.test.ts'],
		globals: false,
		environment: 'node',
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
