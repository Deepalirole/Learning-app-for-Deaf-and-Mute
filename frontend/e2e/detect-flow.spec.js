import { test, expect } from '@playwright/test'

test('Integration B — Detection page renders (stubbed backend)', async ({ page }) => {
  const email = `det_${Date.now()}@gmail.com`

  await page.goto('/signup')
  await page.getByLabel('Name').fill('Det')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[aria-label="Password"]').fill('SecureP@ss1')
  await page.locator('input[aria-label="Confirm Password"]').fill('SecureP@ss1')
  const signUpBtn = page.getByRole('button', { name: /sign up/i })
  await expect(signUpBtn).toBeEnabled({ timeout: 15000 })
  const signupReq = page.waitForResponse((r) => r.url().includes('/auth/signup') && r.status() === 200)
  await signUpBtn.click()
  await signupReq

  await expect(page).toHaveURL(/\/login$/, { timeout: 20000 })
  await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible({ timeout: 20000 })

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[aria-label="Password"]').fill('SecureP@ss1')
  const loginReq = page.waitForResponse((r) => r.url().includes('/auth/login') && r.status() === 200)
  await page.getByRole('button', { name: /log in/i }).click()
  await loginReq

  const nav = page.getByRole('navigation', { name: 'App navigation' })
  await expect(nav).toBeVisible({ timeout: 30000 })

  await nav.getByRole('link', { name: 'Detect' }).click()
  await expect(page).toHaveURL(/\/detect$/, { timeout: 30000 })

  await expect(page.getByRole('heading', { name: /detect/i })).toBeVisible()
})
