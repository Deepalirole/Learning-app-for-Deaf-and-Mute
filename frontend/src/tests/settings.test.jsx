import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import Settings from '../pages/Settings.jsx'

vi.mock('../lib/api', () => {
  return {
    getProfile: vi.fn(async () => ({ data: { success: true, data: { id: 1, name: 'Test', email: 'test@gmail.com' } } })),
    updateProfile: vi.fn(async () => ({ data: { success: true, data: { id: 1, name: 'New', email: 'new@gmail.com' } } })),
    changePassword: vi.fn(async () => ({ data: { success: true, data: { message: 'Password updated' } } })),
    logout: vi.fn(async () => ({ data: { success: true, data: { message: 'Logged out' } } })),
  }
})

import { changePassword, getProfile, logout, updateProfile } from '../lib/api'

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})


describe('Settings page', () => {
  it('TEST 13.1 — Shows skeleton while loading', async () => {
    getProfile.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { success: true, data: { id: 1, name: 'Test', email: 'test@gmail.com' } } }), 200)
        }),
    )

    renderSettings()
    expect(await screen.findByLabelText('Settings skeleton')).toBeInTheDocument()
  })

  it('TEST 13.2 — Loads profile and populates inputs', async () => {
    renderSettings()

    expect(await screen.findByLabelText('Profile form')).toBeInTheDocument()
    expect(screen.getByLabelText('Name').value).toBe('Test')
    expect(screen.getByLabelText('Email').value).toBe('test@gmail.com')
  })

  it('TEST 13.3 — Profile validation blocks invalid email', async () => {
    renderSettings()
    await screen.findByLabelText('Profile form')

    await userEvent.clear(screen.getByLabelText('Email'))
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('TEST 13.4 — Save profile calls updateProfile and shows success', async () => {
    renderSettings()
    await screen.findByLabelText('Profile form')

    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.type(screen.getByLabelText('Name'), 'New')

    await userEvent.clear(screen.getByLabelText('Email'))
    await userEvent.type(screen.getByLabelText('Email'), 'new@gmail.com')

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    expect(await screen.findByText('Profile updated')).toBeInTheDocument()
    expect(updateProfile).toHaveBeenCalled()
  })

  it('TEST 13.5 — Weak new password blocked client-side', async () => {
    renderSettings()
    await screen.findByLabelText('Change password form')

    await userEvent.type(screen.getByLabelText('Current password'), 'SecureP@ss1')
    await userEvent.type(screen.getByLabelText('New password'), 'weak')

    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(screen.getByText('Weak password')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('TEST 13.6 — Logout navigates to /login', async () => {
    renderSettings()
    await screen.findByText('Settings')

    fireEvent.click(screen.getByRole('button', { name: /log out/i }))

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
    expect(logout).toHaveBeenCalled()
  })
})
