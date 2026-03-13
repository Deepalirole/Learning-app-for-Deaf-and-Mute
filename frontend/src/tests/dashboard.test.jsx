import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import Dashboard from '../pages/Dashboard.jsx'

vi.mock('../lib/api', () => {
  return {
    getProgress: vi.fn(async () => ({ data: { success: true, data: null } })),
    getLeaderboard: vi.fn(async () => ({ data: { success: true, data: [] } })),
  }
})

// Recharts is heavy and relies on layout measurements; mock it to keep tests deterministic.
vi.mock('recharts', () => {
  const React = require('react')

  const Box = ({ children }) => React.createElement('div', {}, children)
  const Svg = ({ children }) => React.createElement('svg', {}, children)

  return {
    ResponsiveContainer: ({ children }) => React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    LineChart: Svg,
    AreaChart: Svg,
    XAxis: Box,
    YAxis: Box,
    Tooltip: Box,
    Line: Box,
    Area: Box,
  }
})

import { getLeaderboard, getProgress } from '../lib/api'

beforeEach(() => {
  vi.clearAllMocks()
})


describe('Dashboard page', () => {
  it('TEST 12.1 — Loading skeletons show while fetching', async () => {
    getProgress.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { success: true, data: null } }), 200)
        }),
    )

    render(<Dashboard />)
    expect(await screen.findByLabelText('Stats skeletons')).toBeInTheDocument()
  })

  it('TEST 12.2 — Stats render with units', async () => {
    getProgress.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          completed_lessons: Array.from({ length: 5 }).map((_, i) => ({ lesson_id: i + 1 })),
          avg_accuracy: 0.84,
          total_xp: 120,
          badges_earned: ['first_lesson'],
          weekly_progress: [],
          accuracy_trend: [],
          recent_gestures: [],
          current_streak: 2,
          longest_streak: 7,
        },
      },
    })

    render(<Dashboard />)

    expect(await screen.findByText('5 Lessons')).toBeInTheDocument()
    expect(screen.getByText('84%')).toBeInTheDocument()
    expect(screen.getByText('120 XP')).toBeInTheDocument()
    expect(screen.getByText('1 Badges')).toBeInTheDocument()
  })

  it('TEST 12.3 — Recent gestures list is limited to 10', async () => {
    getProgress.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          completed_lessons: [],
          avg_accuracy: 0,
          total_xp: 0,
          badges_earned: [],
          weekly_progress: [],
          accuracy_trend: [],
          recent_gestures: Array.from({ length: 12 }).map((_, i) => ({
            gesture: `G${i + 1}`,
            confidence: 0.9,
          })),
          current_streak: 0,
          longest_streak: 0,
        },
      },
    })

    render(<Dashboard />)

    const list = await screen.findByLabelText('Recent gestures')
    const items = within(list).getAllByRole('listitem')
    expect(items.length).toBe(10)
  })

  it('TEST 12.4 — Leaderboard preview shows top 3 users', async () => {
    getProgress.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          completed_lessons: [],
          avg_accuracy: 0,
          total_xp: 0,
          badges_earned: [],
          weekly_progress: [],
          accuracy_trend: [],
          recent_gestures: [],
          current_streak: 0,
          longest_streak: 0,
        },
      },
    })

    getLeaderboard.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { name: 'A', total_xp: 100 },
          { name: 'B', total_xp: 90 },
          { name: 'C', total_xp: 80 },
          { name: 'D', total_xp: 70 },
        ],
      },
    })

    render(<Dashboard />)

    const lb = await screen.findByLabelText('Leaderboard preview')
    expect(within(lb).getByText('A')).toBeInTheDocument()
    expect(within(lb).getByText('B')).toBeInTheDocument()
    expect(within(lb).getByText('C')).toBeInTheDocument()
    expect(within(lb).queryByText('D')).toBeNull()
  })
})
