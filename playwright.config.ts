import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4173);
const isCI = !!process.env.CI;

/**
 * Playwright configuration tuned for both local development and slow CI
 * runners (GitHub Actions Linux x64 shared runners are notoriously
 * inconsistent — single-vCPU bursts, IO-bound disk, cold caches).
 *
 * The defaults here favour reliability over speed in CI:
 *   - reducedMotion: 'reduce' so the page disables scroll-snap, the row
 *     pulse animation falls back to a quiet border tween, and smooth-
 *     scrollIntoView resolves immediately. The functional UX paths the
 *     tests assert against are unaffected.
 *   - Test, action, navigation, and expect timeouts are bumped (default
 *     5s expect timeout is too tight when a runner is paging at start-up).
 *   - Per-test 60s ceiling so a single hung selector doesn't sink the
 *     whole suite.
 *   - retries: 2 in CI absorbs runner-side hiccups (process scheduler
 *     pauses, slow disk).
 *   - workers: 1 in CI keeps the preview server's request load
 *     deterministic.
 */
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	timeout: 60_000,
	expect: { timeout: isCI ? 10_000 : 5_000 },
	reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: isCI ? 'retain-on-failure' : 'off',
		actionTimeout: isCI ? 15_000 : 10_000,
		navigationTimeout: isCI ? 30_000 : 20_000,
		// Disables CSS scroll-snap (per the @media (prefers-reduced-motion)
		// rule in src/app.css) and the row-pulse / row-shake keyframes —
		// removes the biggest source of CI flake while keeping every
		// behaviour the tests actually assert against intact.
		reducedMotion: 'reduce'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		command: `pnpm preview --host 127.0.0.1 --port ${PORT}`,
		url: `http://127.0.0.1:${PORT}`,
		reuseExistingServer: !isCI,
		stdout: 'pipe',
		stderr: 'pipe',
		timeout: 120_000
	}
});
