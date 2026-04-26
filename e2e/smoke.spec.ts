import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
	test('renders the headline and question count', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Multivert/i);
		await expect(page.getByRole('heading', { level: 1, name: 'Multivert' })).toBeVisible();
		await expect(page.getByText(/30 questions/i)).toBeVisible();
	});

	test('uses the dark color-scheme meta tag', async ({ page }) => {
		await page.goto('/');
		const colorScheme = await page.locator('meta[name="color-scheme"]').getAttribute('content');
		expect(colorScheme).toBe('light dark');
	});
});
