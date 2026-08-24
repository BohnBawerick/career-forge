import { expect, test } from '@playwright/test'

// The one thing that has to hold in every environment: the front page renders and offers a way
// in, with or without a database behind it. Anything that depends on a live Postgres, or on the
// absence of one, does not belong here while `reuseExistingServer` lets this attach to whatever
// dev server is already running.
test('the front page offers a way in', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'career-forge' })).toBeVisible()
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
})
