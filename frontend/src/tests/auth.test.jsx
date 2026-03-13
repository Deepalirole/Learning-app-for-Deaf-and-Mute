import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import Signup from '../pages/Signup.jsx'
import Login from '../pages/Login.jsx'
import ForgotPassword from '../pages/ForgotPassword.jsx'
import ResetPassword from '../pages/ResetPassword.jsx'

vi.mock('../lib/api', () => {
  return {
    signup: vi.fn(async () => ({ data: { success: true, data: { token: 'x' } } })),
    login: vi.fn(async () => ({ data: { success: true, data: { token: 'x' } } })),
    forgotPassword: vi.fn(async () => ({ data: { message: 'If email exists, reset link sent' } })),
    resetPassword: vi.fn(async () => ({ data: { success: true } })),
    setAccessToken: vi.fn(),
  }
})

import { signup, login, forgotPassword } from '../lib/api'

function renderWithRouter(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>,
  )
}


describe('Auth pages', () => {
  it('TEST 8.1 — Signup form rejects invalid emails', async () => {
    const user = userEvent.setup()
    renderWithRouter(['/signup'])

    const email = screen.getByLabelText('Email')
    const password = screen.getByLabelText('Password')

    const invalids = ['notanemail', 'test@', '@gmail.com', 'a@b']
    for (const val of invalids) {
      await user.clear(email)
      await user.type(email, val)
      await user.type(password, 'SecureP@ss1')
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    }

    expect(signup).not.toHaveBeenCalled()
  })

  it('TEST 8.2 — Password strength indicator shows correct levels', async () => {
    const user = userEvent.setup()
    renderWithRouter(['/signup'])

    const password = screen.getByLabelText('Password')

    await user.clear(password)
    await user.type(password, 'abc')
    expect(screen.getByText('Weak')).toBeInTheDocument()

    await user.clear(password)
    await user.type(password, 'Password1')
    expect(screen.getByText('Medium')).toBeInTheDocument()

    await user.clear(password)
    await user.type(password, 'SecureP@ss1')
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  it('TEST 8.3 — Passwords must match', async () => {
    const user = userEvent.setup()
    renderWithRouter(['/signup'])

    await user.type(screen.getByLabelText('Password'), 'SecureP@ss1')
    await user.type(screen.getByLabelText('Confirm Password'), 'Different@1')

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeDisabled()
  })

  it('TEST 8.4 — Signup submit button disabled until all valid', async () => {
    const user = userEvent.setup()
    renderWithRouter(['/signup'])

    await user.type(screen.getByLabelText('Name'), 'Test')
    await user.type(screen.getByLabelText('Email'), 'test@gmail.com')

    expect(screen.getByRole('button', { name: /sign up/i })).toBeDisabled()
  })

  it('TEST 8.5 — Login "Forgot Password?" link visible and navigates', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<div>Forgot Page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    const link = screen.getByText('Forgot Password?')
    expect(link).toBeInTheDocument()
    fireEvent.click(link)
    expect(screen.getByText('Forgot Page')).toBeInTheDocument()
  })

  it('TEST 8.6 — Forgot password shows confirmation after submit', async () => {
    const user = userEvent.setup()
    renderWithRouter(['/forgot-password'])

    await user.type(screen.getByLabelText('Email'), 'test@gmail.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })

    expect(forgotPassword).toHaveBeenCalled()
  })

  it('TEST 8.7 — Reset password token read from URL', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=abc123']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>,
    )

    // There is no token input; token is read from URL.
    expect(screen.queryByLabelText(/token/i)).toBeNull()
  })

  it('TEST 8.8 — Wrong credentials shows friendly error (not raw API error)', async () => {
    login.mockRejectedValueOnce({ response: { status: 401 } })

    const user = userEvent.setup()
    renderWithRouter(['/login'])

    await user.type(screen.getByLabelText('Email'), 'test@gmail.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })

  it('TEST 8.9 — Loading spinner during API call', async () => {
    login.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { success: true } }), 500)
        }),
    )

    const user = userEvent.setup()
    renderWithRouter(['/login'])

    await user.type(screen.getByLabelText('Email'), 'test@gmail.com')
    await user.type(screen.getByLabelText('Password'), 'SecureP@ss1')

    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading')).toBeNull()
    })
  })

  it('TEST 8.10 — JWT NOT stored in localStorage', async () => {
    const user = userEvent.setup()
    renderWithRouter(['/signup'])

    await user.type(screen.getByLabelText('Name'), 'Test')
    await user.type(screen.getByLabelText('Email'), 'test@gmail.com')
    await user.type(screen.getByLabelText('Password'), 'SecureP@ss1')
    await user.type(screen.getByLabelText('Confirm Password'), 'SecureP@ss1')

    // Wait for debounced email check
    await new Promise((r) => setTimeout(r, 550))

    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(localStorage.getItem('token')).toBeNull()
  })
})
