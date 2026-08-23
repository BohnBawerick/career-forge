import { expect, test } from '@playwright/test'

test('the front page offers a way in', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'career-forge' })).toBeVisible()
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
})

// There is no database here, so every submit fails. Whatever shape the server puts its error in,
// the person has to end up with something to read: an error that reaches the page as a blank
// string would hide the message block entirely and leave the form looking like it did nothing.
test('a failed submit says something instead of going quiet', async ({ page }) => {
  const notAnswering = 'The server is not answering yet'
  const message = page.getByTestId('message')

  await page.goto('/')

  // The dev server compiles the two routes behind this on the first request, so it is slower than
  // an assertion's default patience allows.
  await expect(message).toContainText(notAnswering, { timeout: 60_000 })

  await page.locator('input[name="email"]').fill('nobody@example.com')
  await page.locator('input[name="password"]').fill('a-fabricated-password')
  await page.getByRole('button', { name: /claim this install|sign in/i }).click()

  await expect(message).not.toContainText(notAnswering, { timeout: 60_000 })
  await expect(message).toBeVisible()
  await expect(message).not.toBeEmpty()
})
