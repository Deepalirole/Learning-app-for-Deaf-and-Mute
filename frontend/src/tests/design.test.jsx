import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import Footer from '../lib/Footer.jsx'
import AuthLayout from '../lib/AuthLayout.jsx'
import Login from '../pages/Login.jsx'
import Detect from '../pages/Detect.jsx'
import Learn from '../pages/Learn.jsx'
import NotFound from '../pages/NotFound.jsx'

vi.mock('../lib/api', () => {
  return {
    logout: vi.fn(async () => ({ data: { success: true } })),
    clearAccessToken: vi.fn(),
    login: vi.fn(async () => ({ data: { success: true, data: { token: 'x' } } })),
    setAccessToken: vi.fn(),
    detectFrame: vi.fn(async () => ({ data: { gesture: null, confidence: 0.0 } })),
    getLevels: vi.fn(async () => ({ data: { success: true, data: [{ level: 'beginner', title: 'Level 1 - Alphabet' }] } })),
    getLessons: vi.fn(async () => ({ data: { success: true, data: [] } })),
    getLessonDetail: vi.fn(async () => ({ data: { success: true, data: null } })),
    getQuiz: vi.fn(async () => ({ data: { success: true, data: [] } })),
    completeLesson: vi.fn(async () => ({ data: { success: true, data: { awarded: true, xp: 10 } } })),
  }
})

beforeEach(() => {
  vi.clearAllMocks()

  global.navigator.mediaDevices = {
    getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })),
  }

  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    get() {
      return this._srcObject
    },
    set(v) {
      this._srcObject = v
    },
  })
})

function expectNoInlineStyles(container) {
  expect(container.querySelectorAll('[style]').length).toBe(0)
}

describe('Design + accessibility', () => {
  it('TEST 24.1 — No inline style attributes on core shells', () => {
    const { container: c1 } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    expectNoInlineStyles(c1)

    const { container: c2 } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AuthLayout>
                <div>Page</div>
              </AuthLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expectNoInlineStyles(c2)

    const { container: c3 } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    )
    expectNoInlineStyles(c3)

    const { container: c4 } = render(
      <MemoryRouter>
        <Learn />
      </MemoryRouter>,
    )
    expectNoInlineStyles(c4)
  })

  it('TEST 24.2 — Key aria-labels exist on Detect page controls', async () => {
    render(
      <MemoryRouter>
        <Detect />
      </MemoryRouter>,
    )
    const power = screen.getByLabelText('Toggle camera power')
    fireEvent.click(power)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByLabelText('Toggle camera')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle detection')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle audio')).toBeInTheDocument()
    expect(screen.getByLabelText('Camera video')).toBeInTheDocument()
    expect(screen.getByLabelText('Landmarks canvas')).toBeInTheDocument()
  })

  it('TEST 24.3 — 404 page has accessible actions', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByLabelText('404 actions')).toBeInTheDocument()
  })
})
