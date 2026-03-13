import { test, expect } from '@playwright/test'

test('Integration A — Full new user onboarding (UI flow)', async ({ page }) => {
  const email = `e2e_${Date.now()}@gmail.com`

  await page.goto('/login')
  await page.getByRole('button', { name: /create an account/i }).click()

  await page.getByLabel('Name').fill('E2E User')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[aria-label="Password"]').fill('SecureP@ss1')
  await page.locator('input[aria-label="Confirm Password"]').fill('SecureP@ss1')

  await page.getByRole('button', { name: /sign up/i }).click()

  await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible()

  await page.getByLabel('Email').fill(email)
  await page.locator('input[aria-label="Password"]').fill('SecureP@ss1')
  await page.getByRole('button', { name: /log in/i }).click()

  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  await expect(page.getByLabel('App navigation')).toBeVisible()
})
