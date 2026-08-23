import { expect, test } from '@playwright/test'

test('the front page offers a way in', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'career-forge' })).toBeVisible()
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
})
