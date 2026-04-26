import { expect, test } from '@playwright/test';

test.describe('landing + scroll quiz', () => {
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

	test('renders all four chapter intros (I–IV)', async ({ page }) => {
		await page.goto('/');
		for (const id of ['chapter-energy', 'chapter-belonging', 'chapter-crowds', 'chapter-swings']) {
			await expect(page.locator(`#${id}`)).toBeAttached();
		}
		for (const title of ['Energy', 'Belonging', 'Crowds', 'Swings']) {
			await expect(page.getByRole('heading', { level: 2, name: title })).toBeAttached();
		}
	});

	test('Begin button scrolls the first chapter into view', async ({ page }) => {
		await page.goto('/');
		const firstChapter = page.locator('#chapter-energy');
		const beginAfter = await firstChapter.evaluate((el) => el.getBoundingClientRect().top);
		await page.getByRole('button', { name: /^begin/i }).click();
		await page.waitForTimeout(800);
		const beginAfterClick = await firstChapter.evaluate((el) => el.getBoundingClientRect().top);
		expect(beginAfterClick).toBeLessThan(beginAfter);
		expect(Math.abs(beginAfterClick)).toBeLessThan(200);
	});

	test('progress meter is rendered and starts hidden at the top of the page', async ({ page }) => {
		await page.goto('/');
		const meter = page.locator('.meter');
		await expect(meter).toBeAttached();
		await expect(meter).toHaveAttribute('data-visible', 'false');
		const sy = await page.evaluate(() => window.scrollY);
		expect(sy).toBe(0);
	});

	test('submit CTA is disabled until all questions are answered', async ({ page }) => {
		await page.goto('/');
		const submitBtn = page.locator('.submit__cta');
		await expect(submitBtn).toBeDisabled();
		await expect(submitBtn).toContainText(/more to go/i);
	});

	test('all 30 questions render with sliders', async ({ page }) => {
		await page.goto('/');
		const articles = page.locator('article.row');
		await expect(articles).toHaveCount(30);
		const sliders = page.locator('input[type="range"]');
		await expect(sliders).toHaveCount(30);
	});
});
