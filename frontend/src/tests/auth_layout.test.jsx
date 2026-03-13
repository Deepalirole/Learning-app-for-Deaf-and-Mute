import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import AuthLayout from '../lib/AuthLayout.jsx'

vi.mock('../lib/api', () => {
  return {
    logout: vi.fn(async () => ({ data: { success: true } })),
    clearAccessToken: vi.fn(),
  }
})

import { clearAccessToken, logout } from '../lib/api'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthLayout', () => {
  it('TEST 21.1 — Renders navigation and logs out to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AuthLayout>
                <div>Dashboard Page</div>
              </AuthLayout>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('App navigation')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /log out/i }))

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
    expect(logout).toHaveBeenCalled()
    expect(clearAccessToken).toHaveBeenCalled()
  })
})
