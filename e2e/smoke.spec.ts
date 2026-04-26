import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
	test('renders the headline, five-vert list, and CTA', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Multivert/i);

		await expect(page.getByRole('heading', { level: 1 })).toContainText(/which of the/i);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(/five.{0,3}verts/i);

		await expect(page.getByText(/30 questions/i)).toBeVisible();

		const cta = page.getByRole('link', { name: /start the quiz/i });
		await expect(cta).toBeVisible();
		await expect(cta).toHaveAttribute('href', '/quiz');
	});

	test('renders all five vert names in the right-hand list', async ({ page }) => {
		await page.goto('/');
		for (const name of ['Introvert', 'Extrovert', 'Ambivert', 'Omnivert', 'Otrovert']) {
			await expect(page.getByText(name, { exact: true })).toBeVisible();
		}
	});

	test('uses the light/dark color-scheme meta tag', async ({ page }) => {
		await page.goto('/');
		const colorScheme = await page.locator('meta[name="color-scheme"]').getAttribute('content');
		expect(colorScheme).toBe('light dark');
	});

	test('CTA navigates to the (stub) quiz route', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('link', { name: /start the quiz/i }).click();
		await expect(page).toHaveURL(/\/quiz$/);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(/quiz lands/i);
	});
});
