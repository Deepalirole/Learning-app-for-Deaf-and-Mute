import { test, expect } from '@playwright/test'

test('Support pages render and footer links work', async ({ page }) => {
  await page.goto('/login')
  const footer = page.getByRole('contentinfo', { name: 'Footer' })
  await expect(footer).toBeVisible()

  await footer.getByRole('link', { name: 'Privacy' }).click()
  await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible()

  await page.getByRole('contentinfo', { name: 'Footer' }).getByRole('link', { name: 'Terms' }).click()
  await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible()
})
