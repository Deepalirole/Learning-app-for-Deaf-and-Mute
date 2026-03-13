import { test, expect } from '@playwright/test'

test('ProtectedRoute redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible()
})
