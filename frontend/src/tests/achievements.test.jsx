import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import Achievements from '../pages/Achievements.jsx'

vi.mock('../lib/api', () => {
  return {
    getProgress: vi.fn(async () => ({
      data: {
        success: true,
        data: {
          badges_earned: ['First Sign', 'Week Warrior'],
        },
      },
    })),
  }
})

import { getProgress } from '../lib/api'

function renderAchievements() {
  return render(
    <MemoryRouter initialEntries={['/achievements']}>
      <Routes>
        <Route path="/achievements" element={<Achievements />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Achievements page', () => {
  it('TEST 15.1 — Shows skeleton while loading', async () => {
    getProgress.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { success: true, data: { badges_earned: [] } } }), 200)
        }),
    )

    renderAchievements()
    expect(await screen.findByLabelText('Achievements skeleton')).toBeInTheDocument()
  })

  it('TEST 15.2 — Renders earned badges list', async () => {
    renderAchievements()

    expect(await screen.findByLabelText('Badges list')).toBeInTheDocument()
    expect(screen.getByText('First Sign')).toBeInTheDocument()
    expect(screen.getByText('Week Warrior')).toBeInTheDocument()
  })

  it('TEST 15.3 — Shows empty state when no badges earned', async () => {
    getProgress.mockResolvedValueOnce({ data: { success: true, data: { badges_earned: [] } } })
    renderAchievements()

    expect(await screen.findByText('No badges earned yet.')).toBeInTheDocument()
  })
})
