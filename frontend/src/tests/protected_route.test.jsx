import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import ProtectedRoute from '../lib/ProtectedRoute.jsx'

vi.mock('../lib/api', () => {
  return {
    api: {
      post: vi.fn(),
    },
    getAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
  }
})

import { api, getAccessToken, setAccessToken } from '../lib/api'

function AppShell() {
  return (
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/private"
          element={
            <ProtectedRoute>
              <div>Private Page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProtectedRoute', () => {
  it('TEST 20.1 — Renders children when access token exists', async () => {
    getAccessToken.mockReturnValueOnce('token')
    render(<AppShell />)

    expect(await screen.findByText('Private Page')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('TEST 20.2 — Redirects to /login when refresh fails and no token', async () => {
    getAccessToken.mockReturnValueOnce(null)
    api.post.mockRejectedValueOnce(new Error('no session'))

    render(<AppShell />)

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
    expect(setAccessToken).not.toHaveBeenCalled()
  })

  it('TEST 20.3 — Refresh succeeds, sets token and renders children', async () => {
    getAccessToken.mockReturnValueOnce(null)
    api.post.mockResolvedValueOnce({ data: { success: true, data: { token: 'new-token' } } })

    render(<AppShell />)

    expect(await screen.findByText('Private Page')).toBeInTheDocument()
    expect(setAccessToken).toHaveBeenCalledWith('new-token')
  })
})
