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

	test('submit CTA is disabled until all questions are answered', async ({ page }) => {
		await page.goto('/');
		const submitBtn = page.locator('.submit__cta');
		await expect(submitBtn).toBeDisabled();
		await expect(submitBtn).toContainText(/more to go/i);
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
		await scrollToElement(page, 'chapter-belonging', 400);
		await expect(page.locator('#active-chapter-head')).toHaveCount(1);
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
});
