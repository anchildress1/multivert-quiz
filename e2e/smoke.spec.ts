import { expect, test, type Page } from '@playwright/test';
import { questions } from '../src/lib/questions';

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

const QUESTION_IDS = questions.map((question) => question.id);

const seedAllAnswered = (page: Page) =>
	page.addInitScript((ids: readonly string[]) => {
		const map: Record<string, { state: string; value: number }> = {};
		for (const id of ids) map[id] = { state: 'answered', value: 0 };
		sessionStorage.setItem('multivert.answers.v1', JSON.stringify(map));
	}, QUESTION_IDS);

const scrollToElement = (page: Page, id: string, offset = 0) =>
	page.evaluate(
		({ id: targetId, offset: targetOffset }) => {
			const target = document.getElementById(targetId);
			if (!target) return;
			globalThis.scrollTo({
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
		globalThis.scrollTo({
			top: document.documentElement.scrollHeight,
			behavior: 'instant' as ScrollBehavior
		});
		globalThis.dispatchEvent(
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

	test('renders all questions with native range sliders', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('article.row')).toHaveCount(questions.length);
		await expect(page.locator('input[type="range"]')).toHaveCount(questions.length);
	});

	test('progress strip mounts inside the chapter banner once a chapter intersects', async ({
		page
	}) => {
		await page.goto('/');
		await waitForNudgeArmed(page);
		await scrollToElement(page, 'chapter-energy');
		await expect.poll(() => page.locator('.chapter-head__progress').count()).toBe(1);
	});

	test('result section is not in the DOM until every question is answered', async ({ page }) => {
		await page.goto('/');
		// `{#if store.result}` keeps `#result` out of the DOM entirely until
		// `store.allAnswered` flips. There is no intermediary "submit" panel —
		// finishing the last question is the submit, the result IS the receipt.
		await expect(page.locator('#result')).toHaveCount(0);
	});
});

test.describe('landing + scroll quiz — forward-progress lock', () => {
	test('only the active question is in layout; later rows reveal as the user answers', async ({
		page
	}) => {
		await page.goto('/');
		// Initial state: Q1 is laid out, Q2+ are display:none, later chapters
		// hidden, and the result section is gated by `{#if store.result}`.
		await expect(page.locator('article#q-e-01')).toBeVisible();
		await expect(page.locator('article#q-e-02')).toBeHidden();
		await expect(page.locator('section#chapter-belonging')).toBeHidden();
		await expect(page.locator('#result')).toHaveCount(0);

		// Commit Q1 → Q2 enters layout, but later chapters and the result
		// section remain unavailable until every question is answered.
		await dispatchSliderCommit(page, 'e-01', 0.5);
		await expect(page.locator('article#q-e-02')).toBeVisible();
		await expect(page.locator('article#q-e-03')).toBeHidden();
		await expect(page.locator('section#chapter-belonging')).toBeHidden();
		await expect(page.locator('#result')).toHaveCount(0);
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
		// Regression pin: a reactivity self-loop on `pulseActive` (read inside
		// the effect's guard) once made every nudge after the first a no-op.
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
			globalThis.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
			globalThis.dispatchEvent(
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

		// Q4, the final row, and every later chapter all stay visible — the
		// forward-progress lock is keyed on `[data-state='unset']`, so an
		// in-progress revision (which is no longer unset) does not re-engage
		// the gate. The result section unmounts via `{#if store.result}` while
		// any answer is mid-drag, so it isn't checked here.
		await expect(page.locator('article#q-e-04')).toBeVisible();
		await expect(page.locator('article#q-s-05')).toBeVisible();
		await expect(page.locator('section#chapter-swings')).toBeVisible();
	});
});

test.describe('landing + scroll quiz — navigation', () => {
	test('Begin button scrolls the first chapter into view', async ({ page }) => {
		await page.goto('/');
		// `scrollToId` short-circuits if the chapter element isn't mounted yet;
		// the nudge-listener flag is the same hydration signal the rest of the
		// suite anchors on.
		await waitForNudgeArmed(page);
		await page.evaluate(() =>
			globalThis.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
		);
		const beforeY = await page.evaluate(() => globalThis.scrollY);
		await page.evaluate(() => {
			const btn = Array.from(document.querySelectorAll('button')).find((b) =>
				/^\s*begin/i.test(b.textContent ?? '')
			);
			btn?.click();
		});
		// Anchor on the scrollY actually moving past the hero rather than a
		// sleep — works across slow runners.
		await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBeGreaterThan(beforeY);
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

test.describe('share + SEO surface', () => {
	// PNG magic header (RFC 2083 §3.1). A truncated/corrupted asset still
	// passing a content-type check is the silent-failure mode this guards.
	const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const CANONICAL_URL = 'https://multivert.pages.dev/';

	test('serves robots.txt with sitemap directive', async ({ request }) => {
		const res = await request.get('/robots.txt');
		expect(res.status()).toBe(200);
		const body = await res.text();
		expect(body).toMatch(/User-agent:\s*\*/i);
		expect(body).toMatch(/Sitemap:\s+https:\/\/.+\/sitemap\.xml/);
	});

	test('serves a valid sitemap.xml pointing at the canonical URL', async ({ request }) => {
		const res = await request.get('/sitemap.xml');
		expect(res.status()).toBe(200);
		const body = await res.text();
		expect(body).toContain('<urlset');
		expect(body).toContain(`<loc>${CANONICAL_URL}</loc>`);
	});

	test('serves the PWA manifest with required fields', async ({ request }) => {
		const res = await request.get('/manifest.webmanifest');
		expect(res.status()).toBe(200);
		// Cloudflare Pages must serve `.webmanifest` as the right MIME or
		// Chrome's install prompt silently falls back to a link bookmark.
		expect(res.headers()['content-type']).toMatch(
			/^application\/manifest\+json|^application\/json/
		);
		const manifest = (await res.json()) as {
			name: string;
			short_name: string;
			start_url: string;
			display: string;
			icons: Array<{ src: string; sizes: string; type: string }>;
		};
		expect(manifest.name).toMatch(/Multivert/i);
		expect(manifest.short_name).toBe('Multivert');
		expect(manifest.start_url).toBe('/');
		// `standalone` is what triggers the Android Chrome "Install app"
		// banner; `browser` would degrade to a normal tab bookmark.
		expect(manifest.display).toBe('standalone');
		expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
		const sizes = manifest.icons.map((icon) => icon.sizes);
		// 192x192 + 512x512 are the documented Chrome install-prompt minimums.
		expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
	});

	test('every icon declared in the manifest actually resolves', async ({ request }) => {
		// Drift guard: the manifest can list icons that don't exist (typo,
		// removed file, wrong path). Iterate the declarations rather than
		// asserting hardcoded paths so the test fails on any mismatch.
		const res = await request.get('/manifest.webmanifest');
		const manifest = (await res.json()) as {
			icons: Array<{ src: string; type: string }>;
		};
		for (const icon of manifest.icons) {
			const iconRes = await request.get(icon.src);
			expect(iconRes.status(), `manifest icon ${icon.src} should resolve`).toBe(200);
			const contentType = iconRes.headers()['content-type'] ?? '';
			expect(
				contentType.startsWith(icon.type),
				`manifest icon ${icon.src} should be served as ${icon.type} (got ${contentType})`
			).toBe(true);
		}
	});

	test('apple-touch-icon and PWA icons are valid PNGs of the expected size', async ({
		request
	}) => {
		// Pair a content-type check with a magic-byte check so a 12-byte HTML
		// 404 served as image/png cannot pass. Each icon also has a minimum
		// byte floor — a 0-byte placeholder would otherwise ship green.
		const expected: Array<{ path: string; minBytes: number }> = [
			{ path: '/apple-touch-icon.png', minBytes: 500 },
			{ path: '/icon-192.png', minBytes: 1_000 },
			{ path: '/icon-512.png', minBytes: 5_000 }
		];
		for (const { path, minBytes } of expected) {
			const res = await request.get(path);
			expect(res.status(), `${path} should resolve`).toBe(200);
			expect(res.headers()['content-type']).toMatch(/^image\/png/);
			const buf = Buffer.from(await res.body());
			expect(buf.byteLength, `${path} should not be empty`).toBeGreaterThan(minBytes);
			expect(buf.subarray(0, 8).equals(PNG_MAGIC), `${path} should start with PNG magic`).toBe(
				true
			);
		}
	});

	test('OG image is a valid PNG within the WhatsApp share ceiling', async ({ request }) => {
		// Lower bound catches a pipeline that "compressed" the asset to nothing;
		// upper bound catches regression past WhatsApp's ~300KB unfurl ceiling
		// (Meta's documented OG image cap — exceeding it silently strips the
		// preview thumbnail across WhatsApp/iMessage/Slack on slow links).
		const res = await request.get('/og-image.png');
		expect(res.status()).toBe(200);
		expect(res.headers()['content-type']).toMatch(/^image\/png/);
		const buf = Buffer.from(await res.body());
		expect(buf.byteLength).toBeGreaterThan(50_000);
		expect(buf.byteLength).toBeLessThan(300_000);
		expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
	});

	test('document head wires the full share + PWA tag set', async ({ page }) => {
		await page.goto('/');
		// Apple/PWA hooks
		await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
			'href',
			/apple-touch-icon\.png$/
		);
		await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
			'href',
			/manifest\.webmanifest$/
		);
		await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
			'content',
			'Multivert'
		);
		await expect(page.locator('meta[name="application-name"]')).toHaveAttribute(
			'content',
			'Multivert'
		);
		// Canonical + OG/Twitter share contract — declared dimensions must
		// match the actual asset (1200x630) or LinkedIn/Slack crop the preview.
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', CANONICAL_URL);
		await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', CANONICAL_URL);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			/og-image\.png$/
		);
		await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
			'content',
			'1200'
		);
		await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
			'content',
			'630'
		);
		await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute(
			'content',
			'image/png'
		);
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
			'content',
			'summary_large_image'
		);
		// JSON-LD presence (deep-checked elsewhere if/when search consoles complain).
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
	});
});

test.describe('landing + scroll quiz — answer interaction', () => {
	test('committing a slider answer advances the answered count', async ({ page }) => {
		await page.goto('/');
		await scrollToElement(page, 'chapter-energy');
		await expect(page.locator('article#q-e-01')).toHaveAttribute('data-state', 'unset');
		await dispatchSliderCommit(page, 'e-01', 0.5);
		await expect(page.locator('article#q-e-01')).toHaveAttribute('data-state', 'answered');
		await expect(page.locator('.chapter-head__progress-count strong')).toHaveText('1');
	});

	test('clicking the slider track at neutral commits a 0 value', async ({ page }) => {
		// Click-only path (no input/change) — the slider's `onclick` handler
		// must commit even when the value didn't change.
		await page.goto('/');
		await scrollToElement(page, 'chapter-energy');
		await dispatchSliderClick(page, 'e-01');
		await expect(page.locator('article#q-e-01')).toHaveAttribute('data-state', 'answered');
		const persisted = await page.evaluate(() => {
			const raw = sessionStorage.getItem('multivert.answers.v1');
			return raw ? JSON.parse(raw)['e-01'] : null;
		});
		expect(persisted).toEqual({ state: 'answered', value: 0 });
	});

	test('answering all questions surfaces the result section', async ({ page }) => {
		await seedAllAnswered(page);
		await page.goto('/');
		// `{#if store.result}` mounts the result section once the store has a
		// computed verdict — there is no intermediary submit panel.
		await expect(page.locator('#result')).toBeAttached();
		// The Pantone-style swatch hero prints just the archetype name in caps —
		// e.g. "OTROVERT" — as the colour name. No "You are an" prefix.
		await expect(page.locator('#result-title')).toHaveText(
			/^(INTROVERT|EXTROVERT|AMBIVERT|OMNIVERT|OTROVERT)$/
		);
		await expect(page.locator('.breakdown__chip')).toHaveCount(5);
		// The body paragraphs come from `descriptions[dominant].body` — confirm
		// at least one renders with substantive copy.
		await expect(page.locator('.swatch__body').first()).toBeAttached();
		const bodyText = (await page.locator('.swatch__body').first().textContent()) ?? '';
		expect(bodyText.trim().length).toBeGreaterThanOrEqual(40);
		// The result section carries data-dominant matching the headline archetype,
		// which the radial accent wash binds to via inline custom properties.
		const dominant = await page.locator('#result').getAttribute('data-dominant');
		expect(dominant).toMatch(/^(introvert|extrovert|ambivert|omnivert|otrovert)$/);
	});

	test('clicking a result bar opens the per-archetype detail sheet', async ({ page }) => {
		await seedAllAnswered(page);
		await page.goto('/');
		await expect(page.locator('#result')).toBeAttached();
		// The result section sits at the bottom of a long scroll-snapped page.
		// Scroll the verdict block into view before interacting — auto-scroll
		// on click fights the snap container.
		await scrollToElement(page, 'result');

		// Primary affordance: the swatch-hero CTA opens the dominant archetype's sheet.
		const primary = page.locator('[data-testid="result-read-guide-button"]');
		await primary.scrollIntoViewIfNeeded();
		const dominantArchetype = await page.locator('#result').getAttribute('data-dominant');
		await primary.click();
		const primaryDialog = page.locator('[role="dialog"][aria-modal="true"]');
		await expect(primaryDialog).toBeVisible();
		await expect(primaryDialog).toHaveAttribute('data-archetype', dominantArchetype ?? '');
		await page.keyboard.press('Escape');
		await expect(primaryDialog).toHaveCount(0);
		await expect(primary).toBeFocused();

		// Secondary affordance: per-vert bar buttons. Click introvert directly,
		// assert the dialog mounts for that archetype, and that escape returns
		// focus to the bar trigger.
		const trigger = page.locator('[data-testid="result-bar-button-introvert"]');
		await trigger.scrollIntoViewIfNeeded();
		await trigger.click();

		const dialog = page.locator('[role="dialog"][aria-modal="true"]');
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAttribute('data-archetype', 'introvert');
		// Title is the archetype name; body jumps straight into the field-guide content.
		await expect(page.locator('#vert-sheet-title')).toHaveText('INTROVERT');
		await expect(page.locator('.sheet__day-text')).toBeVisible();
		await expect(page.locator('.sheet__truth')).toHaveCount(5);
		await expect(page.locator('.sheet__giveaway').first()).toBeVisible();
		await expect(page.locator('.sheet__pull-text')).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await expect(trigger).toBeFocused();
	});

	test('retake clears every answer, hides the result, and clears sessionStorage', async ({
		page
	}) => {
		await seedAllAnswered(page);
		await page.goto('/');
		await expect(page.locator('#result')).toBeAttached();
		// The retake button uses the editorial "Start over." label — anchor the
		// e2e to that copy so a future label tweak is caught alongside the visual.
		await expect(page.locator('.result__retake')).toContainText(/start over/i);

		await page.locator('.result__retake').click();

		await expect(page.locator('#result')).toHaveCount(0);
		// After reset, the first question is the only thing in layout — every
		// downstream chapter is gated by the forward-progress lock again.
		await expect(page.locator('article#q-e-01')).toBeVisible();
		await expect(page.locator('article#q-e-02')).toBeHidden();

		const storedStates = await page.evaluate(() => {
			const raw = sessionStorage.getItem('multivert.answers.v1');
			if (!raw) return null;
			const parsed = JSON.parse(raw) as Record<string, { state: string; value: number | null }>;
			return Object.values(parsed).map((entry) => entry.state);
		});
		expect(storedStates).not.toBeNull();
		expect(storedStates?.every((state) => state === 'unset')).toBe(true);
	});
});

test.describe('chapter banner — always-on reset', () => {
	const resetSelector = '[data-testid="chapter-reset"]';

	test('reset button is mounted in the banner and starts disabled with no answers', async ({
		page
	}) => {
		await page.goto('/');
		await waitForNudgeArmed(page);
		// Scroll the banner into view (the cover hero ghosts it on first paint).
		await scrollToElement(page, 'chapter-energy');
		const resetButton = page.locator(resetSelector);
		await expect(resetButton).toBeAttached();
		await expect(resetButton).toBeDisabled();
		await expect(resetButton).toHaveAttribute('aria-label', 'Reset all answers');
	});

	test('reset button enables the moment a single answer commits', async ({ page }) => {
		await page.goto('/');
		await waitForNudgeArmed(page);
		await scrollToElement(page, 'chapter-energy');
		const resetButton = page.locator(resetSelector);
		await expect(resetButton).toBeDisabled();
		await dispatchSliderCommit(page, 'e-01', 0.5);
		await expect(resetButton).toBeEnabled();
	});

	test('two-tap confirm: first click swaps the label, does not clear; second click clears', async ({
		page
	}) => {
		// Mid-quiz reset path: user has answered some but not all questions.
		// The forward-progress lock means they cannot reach the result section,
		// so this is the only way to bail out short of nuking the tab.
		await page.goto('/');
		await waitForNudgeArmed(page);
		await scrollToElement(page, 'chapter-energy');
		await dispatchSliderCommit(page, 'e-01', 0.5);
		await expect(page.locator('article#q-e-01')).toHaveAttribute('data-state', 'answered');

		const resetButton = page.locator(resetSelector);
		await resetButton.click();
		await expect(resetButton).toHaveAttribute('data-confirm', 'true');
		await expect(resetButton).toContainText(/confirm/i);
		await expect(resetButton).toHaveAttribute('aria-label', 'Confirm reset — clears every answer');
		// Confirm-pending state must NOT clear answers on its own.
		await expect(page.locator('article#q-e-01')).toHaveAttribute('data-state', 'answered');

		await resetButton.click();
		// State flips back to unset, sessionStorage is wiped, banner reverts.
		await expect(page.locator('article#q-e-01')).toHaveAttribute('data-state', 'unset');
		await expect(resetButton).toHaveAttribute('data-confirm', 'false');
		await expect(resetButton).toBeDisabled();
		const storedStates = await page.evaluate(() => {
			const raw = sessionStorage.getItem('multivert.answers.v1');
			if (!raw) return null;
			const parsed = JSON.parse(raw) as Record<string, { state: string; value: number | null }>;
			return Object.values(parsed).map((entry) => entry.state);
		});
		expect(storedStates?.every((state) => state === 'unset')).toBe(true);
	});

	test('reset from the result section works through the same banner button', async ({ page }) => {
		// The banner stays mounted on the result page (the active section just
		// flips to "Result"), so the always-on reset must still work there
		// even though the editorial result__retake also exists. The banner is
		// `ghost`-hidden while the cover hero owns the viewport, so we must
		// scroll past it before the button becomes clickable.
		await seedAllAnswered(page);
		await page.goto('/');
		await expect(page.locator('#result')).toBeAttached();
		await waitForNudgeArmed(page);
		await scrollToElement(page, 'result');

		const resetButton = page.locator(resetSelector);
		await expect(resetButton).toBeVisible();
		await expect(resetButton).toBeEnabled();

		await resetButton.click();
		await expect(resetButton).toHaveAttribute('data-confirm', 'true');
		await resetButton.click();

		await expect(page.locator('#result')).toHaveCount(0);
		await expect(page.locator('article#q-e-01')).toBeVisible();
		await expect(page.locator('article#q-e-02')).toBeHidden();
	});
});
