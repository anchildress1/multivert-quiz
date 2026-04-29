import { expect, test, type Page } from '@playwright/test';

/**
 * E2E suite for the single-page quiz. Designed to be CI-friendly on slow
 * GitHub Actions runners:
 *   - No `waitForTimeout` on the happy path — every wait is anchored to a
 *     real signal (`expect.poll`, `waitForFunction`, or DOM-bound assertions).
 *   - Programmatic `scrollTo` and click dispatch via `page.evaluate` instead
 *     of Playwright actionability checks, which fight the page's
 *     scroll-snap + lock behaviour.
 *   - `reducedMotion: 'reduce'` (set in playwright.config) disables CSS
 *     animations and scroll-snap so the page is deterministic frame-to-frame.
 *
 * Helpers
 * -------
 */

const QUESTION_IDS = [
	'e-01',
	'e-02',
	'e-03',
	'e-04',
	'e-05',
	'e-06',
	'e-07',
	'e-08',
	'e-09',
	'e-10',
	'b-01',
	'b-02',
	'b-03',
	'b-04',
	'b-05',
	'b-06',
	'b-07',
	'b-08',
	'b-09',
	'b-10',
	'g-01',
	'g-02',
	'g-03',
	'g-04',
	'g-05',
	's-01',
	's-02',
	's-03',
	's-04',
	's-05'
] as const;

const seedAllAnswered = (page: Page) =>
	page.addInitScript(
		(ids: readonly string[]) => {
			const map: Record<string, { state: string; value: number }> = {};
			for (const id of ids) map[id] = { state: 'answered', value: 0 };
			localStorage.setItem('multivert.answers.v1', JSON.stringify(map));
		},
		QUESTION_IDS as unknown as string[]
	);

const scrollToElement = (page: Page, id: string, offset = 0) =>
	page.evaluate(
		({ id: targetId, offset: targetOffset }) => {
			const target = document.getElementById(targetId);
			if (!target) return;
			window.scrollTo({
				top: target.offsetTop + targetOffset,
				behavior: 'instant' as ScrollBehavior
			});
		},
		{ id, offset }
	);

const dispatchSliderCommit = (page: Page, questionId: string, value: number) =>
	page.evaluate(
		({ qid, v }) => {
			const slider = document.querySelector<HTMLInputElement>(`#q-${qid} input[type="range"]`);
			if (!slider) throw new Error(`slider for ${qid} not found`);
			slider.value = String(v);
			slider.dispatchEvent(new Event('input', { bubbles: true }));
			slider.dispatchEvent(new Event('change', { bubbles: true }));
		},
		{ qid: questionId, v: value }
	);

const dispatchSliderClick = (page: Page, questionId: string) =>
	page.evaluate((qid) => {
		const slider = document.querySelector<HTMLInputElement>(`#q-${qid} input[type="range"]`);
		if (!slider) throw new Error(`slider for ${qid} not found`);
		slider.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	}, questionId);

const waitForNudgeArmed = (page: Page) =>
	page.waitForFunction(() => document.body.dataset.nudgeListener === 'on');

const dispatchForwardWheel = (page: Page) =>
	page.evaluate(() => {
		window.scrollTo({
			top: document.documentElement.scrollHeight,
			behavior: 'instant' as ScrollBehavior
		});
		window.dispatchEvent(
			new WheelEvent('wheel', {
				deltaY: 60,
				deltaMode: 0,
				bubbles: true,
				cancelable: true
			})
		);
	});

/* --------------------------------------------------------------------- */

test.describe('landing + scroll quiz — structure', () => {
	test('renders the headline, CTA, and five-vert reference card', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Multivert/i);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(/which of the/i);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(/five.{0,3}verts/i);
		await expect(page.getByRole('button', { name: /^begin/i })).toBeVisible();
		for (const name of ['Introvert', 'Extrovert', 'Ambivert', 'Omnivert', 'Otrovert']) {
			await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
		}
	});

	test('renders all four chapter sections (I–IV)', async ({ page }) => {
		await page.goto('/');
		for (const id of ['chapter-energy', 'chapter-belonging', 'chapter-crowds', 'chapter-swings']) {
			await expect(page.locator(`#${id}`)).toBeAttached();
		}
		const chapterLabels = await page.locator('section.chapter-wrap[aria-label]').count();
		expect(chapterLabels).toBe(4);
	});

	test('renders all 30 questions with native range sliders', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('article.row')).toHaveCount(30);
		await expect(page.locator('input[type="range"]')).toHaveCount(30);
	});

	test('progress meter is mounted', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.meter')).toBeAttached();
	});

	test('submit CTA is disabled and out of layout until all questions are answered', async ({
		page
	}) => {
		await page.goto('/');
		const submitBtn = page.locator('.submit__cta');
		// Still disabled and still carries the holding-pattern copy for AT users.
		await expect(submitBtn).toBeDisabled();
		await expect(submitBtn).toContainText(/more to go/i);
		// Forward-progress lock keeps the submit panel out of layout (display:
		// none) until the last gating question is committed, so a sighted user
		// physically cannot scroll to it.
		await expect(submitBtn).not.toBeVisible();
	});
});

test.describe('landing + scroll quiz — forward-progress lock', () => {
	test('only the active question is in layout; later rows reveal as the user answers', async ({
		page
	}) => {
		await page.goto('/');
		// Initial state: Q1 is laid out, Q2+ are display:none, later chapters hidden.
		await expect(page.locator('article#q-e-01')).toBeVisible();
		await expect(page.locator('article#q-e-02')).toBeHidden();
		await expect(page.locator('section#chapter-belonging')).toBeHidden();
		await expect(page.locator('section#submit')).toBeHidden();

		// Commit Q1 → Q2 enters layout, but later chapters and submit remain hidden.
		await dispatchSliderCommit(page, 'e-01', 0.5);
		await expect(page.locator('article#q-e-02')).toBeVisible();
		await expect(page.locator('article#q-e-03')).toBeHidden();
		await expect(page.locator('section#chapter-belonging')).toBeHidden();
		await expect(page.locator('section#submit')).toBeHidden();
	});

	test('forward-scroll attempt at the document floor pulses the gating row', async ({ page }) => {
		await page.goto('/');
		// Wait for hydration — the wheel listener is attached inside an
		// $effect that only runs after the gating row mounts.
		await expect(page.locator('article#q-e-01')).toBeVisible();
		await waitForNudgeArmed(page);
		await dispatchForwardWheel(page);
		await expect(page.locator('article#q-e-01.row--nudged')).toBeAttached();
		// The pulse class strips itself after the animation completes.
		await expect
			.poll(() => page.locator('article#q-e-01.row--nudged').count(), { timeout: 2000 })
			.toBe(0);
	});

	test('subsequent forward-scroll attempts re-pulse (the effect does not get stuck)', async ({
		page
	}) => {
		// Regression: the previous implementation read `pulseActive` inside
		// the effect's guard, making it a reactivity dependency. The effect
		// re-ran from its own write, the cleanup cancelled the timer that
		// would have reset `pulseActive`, and the row got stuck — every
		// nudge after the first was a no-op. This test pins the fix.
		await page.goto('/');
		await expect(page.locator('article#q-e-01')).toBeVisible();
		await waitForNudgeArmed(page);

		// First nudge.
		await dispatchForwardWheel(page);
		await expect(page.locator('article#q-e-01.row--nudged')).toBeAttached();
		await expect
			.poll(() => page.locator('article#q-e-01.row--nudged').count(), { timeout: 2000 })
			.toBe(0);

		// Second nudge — must pulse again, not silently no-op. Wait past the
		// 700ms in-route debounce before firing.
		await page.waitForTimeout(750);
		await dispatchForwardWheel(page);
		await expect(page.locator('article#q-e-01.row--nudged')).toBeAttached();
		await expect
			.poll(() => page.locator('article#q-e-01.row--nudged').count(), { timeout: 2000 })
			.toBe(0);

		// Third nudge — for good measure.
		await page.waitForTimeout(750);
		await dispatchForwardWheel(page);
		await expect(page.locator('article#q-e-01.row--nudged')).toBeAttached();
	});

	test('forward-scroll attempt mid-document does NOT pulse (only triggers at the floor)', async ({
		page
	}) => {
		// With every question answered the layout extends past Q1, so a wheel
		// event at the top of the page is normal scrolling, not an attempt to
		// push past a wall. The pulse must stay quiet.
		await seedAllAnswered(page);
		await page.goto('/');
		await expect(page.locator('article#q-e-01')).toBeVisible();
		await waitForNudgeArmed(page);
		await page.evaluate(() => {
			window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
			window.dispatchEvent(
				new WheelEvent('wheel', {
					deltaY: 60,
					deltaMode: 0,
					bubbles: true,
					cancelable: true
				})
			);
		});
		// Tiny settle window — confirm no row picked up the nudge class.
		await page.waitForTimeout(120);
		await expect(page.locator('article.row--nudged')).toHaveCount(0);
	});

	test('mid-drag revision of an earlier answer does not re-collapse later content', async ({
		page
	}) => {
		// Once a row leaves `unset` it stays revealed, so dragging an answered
		// row's slider mid-revision must not hide the rows below.
		await seedAllAnswered(page);
		await page.goto('/');
		await expect(page.locator('article#q-s-05')).toBeVisible();

		// Bump Q3 into in-progress (mid-drag) without committing.
		await page.evaluate(() => {
			const slider = document.querySelector<HTMLInputElement>('#q-e-03 input[type="range"]');
			if (!slider) throw new Error('slider for e-03 not found');
			slider.value = '0.4';
			slider.dispatchEvent(new Event('input', { bubbles: true }));
		});
		await expect(page.locator('article#q-e-03')).toHaveAttribute('data-state', 'in-progress');

		// Q4 and the final row both stay visible — the gate is not re-engaged.
		await expect(page.locator('article#q-e-04')).toBeVisible();
		await expect(page.locator('article#q-s-05')).toBeVisible();
		await expect(page.locator('section#submit')).toBeVisible();
	});
});

test.describe('landing + scroll quiz — navigation', () => {
	test('Begin button scrolls the first chapter into view', async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
		const beforeY = await page.evaluate(() => window.scrollY);
		await page.evaluate(() => {
			const btn = Array.from(document.querySelectorAll('button')).find((b) =>
				/^\s*begin/i.test(b.textContent ?? '')
			);
			(btn as HTMLButtonElement | undefined)?.click();
		});
		// Anchor on the scrollY actually moving past the hero rather than a
		// sleep — works across slow runners.
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforeY);
	});

	test('shared chapter header swaps when the user enters a chapter', async ({ page }) => {
		// Seed all answered so the forward-progress lock is disabled.
		await seedAllAnswered(page);
		await page.goto('/');
		// Wait for hydration. The chapter IntersectionObserver attaches in the
		// same render pass as the nudge listener, so the latter's signal is a
		// reliable proxy that observation is wired up.
		await waitForNudgeArmed(page);
		await scrollToElement(page, 'chapter-belonging', 400);
		// IntersectionObserver fires async — its callback is queued for the
		// next frame, and on a busy worker the first poll may run before the
		// frame lands. Use expect.poll so we keep retrying past short stalls.
		await expect
			.poll(() => page.locator('#active-chapter-head').count(), { timeout: 8000 })
			.toBe(1);
		await expect(page.locator('#active-chapter-head')).toContainText(/Belonging/i);
	});
});

test.describe('landing + scroll quiz — answer interaction', () => {
	test('committing a slider answer advances the answered count', async ({ page }) => {
		await page.goto('/');
		await scrollToElement(page, 'chapter-energy');
		await expect(page.locator('article#q-e-01')).toHaveAttribute('data-state', 'unset');
		await dispatchSliderCommit(page, 'e-01', 0.5);
		await expect(page.locator('article#q-e-01')).toHaveAttribute('data-state', 'answered');
		await expect(page.locator('.meter__count strong')).toHaveText('1');
	});

	test('clicking the slider track at neutral commits a 0 value', async ({ page }) => {
		// Click-only path (no input/change) — the slider's `onclick` handler
		// must commit even when the value didn't change.
		await page.goto('/');
		await scrollToElement(page, 'chapter-energy');
		await dispatchSliderClick(page, 'e-01');
		await expect(page.locator('article#q-e-01')).toHaveAttribute('data-state', 'answered');
		const persisted = await page.evaluate(() => {
			const raw = localStorage.getItem('multivert.answers.v1');
			return raw ? JSON.parse(raw)['e-01'] : null;
		});
		expect(persisted).toEqual({ state: 'answered', value: 0 });
	});

	test('answering all 30 questions enables the submit CTA and surfaces a result', async ({
		page
	}) => {
		await seedAllAnswered(page);
		await page.goto('/');
		const submitBtn = page.locator('.submit__cta');
		await expect(submitBtn).toBeEnabled();
		await expect(submitBtn).toContainText(/breakdown/i);
		// The result section is conditionally rendered when store.result is non-null.
		await expect(page.locator('#result')).toBeAttached();
		await expect(page.locator('#result-title')).toContainText(/^You are an/i);
		await expect(page.locator('.result__bar')).toHaveCount(5);
	});

	test('retake clears every answer, hides the result, and clears localStorage', async ({
		page
	}) => {
		await seedAllAnswered(page);
		await page.goto('/');
		await expect(page.locator('#result')).toBeAttached();

		await page.locator('.result__retake').click();

		await expect(page.locator('#result')).toHaveCount(0);
		await expect(page.locator('.submit__cta')).toBeDisabled();

		const storedStates = await page.evaluate(() => {
			const raw = localStorage.getItem('multivert.answers.v1');
			if (!raw) return null;
			const parsed = JSON.parse(raw) as Record<string, { state: string; value: number | null }>;
			return Object.values(parsed).map((entry) => entry.state);
		});
		expect(storedStates).not.toBeNull();
		expect(storedStates?.every((state) => state === 'unset')).toBe(true);
	});
});
