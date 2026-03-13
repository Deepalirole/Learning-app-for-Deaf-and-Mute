import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import Learn from '../pages/Learn.jsx'

vi.mock('../lib/api', () => {
  return {
    getLevels: vi.fn(async () => ({ data: { success: true, data: [
      { level: 'beginner', title: 'Level 1 - Alphabet' },
      { level: 'intermediate', title: 'Level 2 - Words' },
      { level: 'advanced', title: 'Level 3 - Phrases' },
    ] } })),
    getLessons: vi.fn(async () => ({ data: { success: true, data: [] } })),
    getLessonDetail: vi.fn(async () => ({ data: { success: true, data: {
      id: 1,
      title: 'A',
      level: 'beginner',
      category: 'alphabet',
      sign_image_url: 'img',
      sign_gif_url: 'gif',
      description: 'desc',
      xp_reward: 10,
      landmark_hint: 'hint',
    } } })),
    getQuiz: vi.fn(async () => ({ data: { success: true, data: [] } })),
    completeLesson: vi.fn(async () => ({ data: { success: true, data: { awarded: true } } })),
  }
})

import { completeLesson, getLessons, getLevels, getQuiz } from '../lib/api'

function renderLearn() {
  return render(
    <MemoryRouter initialEntries={['/learn']}>
      <Routes>
        <Route path="/learn" element={<Learn />} />
        <Route path="/practice" element={<div>Practice Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})


describe('Learn page', () => {
  it('TEST 10.1 — All 3 levels visible in sidebar', async () => {
    renderLearn()

    expect(await screen.findByText('Level 1 - Alphabet')).toBeInTheDocument()
    expect(screen.getByText('Level 2 - Words')).toBeInTheDocument()
    expect(screen.getByText('Level 3 - Phrases')).toBeInTheDocument()
  })

  it('TEST 10.2 — Lesson grid shows correct count', async () => {
    getLessons.mockResolvedValueOnce({
      data: {
        success: true,
        data: Array.from({ length: 26 }).map((_, i) => ({
          id: i + 1,
          title: String.fromCharCode(65 + i),
          category: 'alphabet',
          completed: false,
        })),
      },
    })

    renderLearn()

    const grid = await screen.findByLabelText('Lesson grid')
    const cards = grid.querySelectorAll('button')
    expect(cards.length).toBe(26)
  })

  it('TEST 10.3 — Completed lesson shows checkmark', async () => {
    getLessons.mockResolvedValueOnce({
      data: { success: true, data: [{ id: 1, title: 'A', category: 'alphabet', completed: true }] },
    })

    renderLearn()

    expect(await screen.findByLabelText('Completed')).toBeInTheDocument()
  })

  it('TEST 10.4 — Progress bar reflects completion accurately', async () => {
    getLessons.mockResolvedValueOnce({
      data: {
        success: true,
        data: Array.from({ length: 26 }).map((_, i) => ({
          id: i + 1,
          title: String.fromCharCode(65 + i),
          category: 'alphabet',
          completed: i < 13,
        })),
      },
    })

    renderLearn()

    expect(await screen.findByLabelText('Progress percent')).toHaveTextContent('50%')
  })

  it('TEST 10.5 — Lesson detail modal opens on card click', async () => {
    getLessons.mockResolvedValueOnce({
      data: { success: true, data: [{ id: 1, title: 'A', category: 'alphabet', completed: false }] },
    })

    renderLearn()

    const grid = await screen.findByLabelText('Lesson grid')
    fireEvent.click(grid.querySelector('button'))

    const modal = await screen.findByLabelText('Lesson modal')
    expect(modal).toBeInTheDocument()
    expect(within(modal).getByText('A')).toBeInTheDocument()
    expect(within(modal).getByText(/XP:/)).toBeInTheDocument()
  })

  it('TEST 10.6 — Quiz has exactly 5 questions', async () => {
    getLessons.mockResolvedValueOnce({
      data: { success: true, data: [{ id: 1, title: 'A', category: 'alphabet', completed: false }] },
    })

    getQuiz.mockResolvedValueOnce({
      data: {
        success: true,
        data: Array.from({ length: 5 }).map((_, i) => ({
          lesson_id: i + 1,
          prompt_gif_url: 'gif',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
        })),
      },
    })

    renderLearn()

    const grid = await screen.findByLabelText('Lesson grid')
    fireEvent.click(grid.querySelector('button'))
    fireEvent.click(await screen.findByRole('button', { name: /take quiz/i }))

    expect(await screen.findByText('Question 1 of 5')).toBeInTheDocument()

    const user = userEvent.setup()
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getAllByRole('button', { name: 'A' })[0])
      await user.click(screen.getByRole('button', { name: /next/i }))
      await waitFor(() => {})
    }

    expect(screen.getByText('Question 5 of 5')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'A' })[0])
    await user.click(screen.getByRole('button', { name: /finish/i }))

    expect(await screen.findByLabelText('Quiz score')).toBeInTheDocument()
  })

  it('TEST 10.9 — "Practice This Sign" button on lesson opens camera', async () => {
    getLessons.mockResolvedValueOnce({
      data: { success: true, data: [{ id: 1, title: 'A', category: 'alphabet', completed: false }] },
    })

    renderLearn()

    const grid = await screen.findByLabelText('Lesson grid')
    fireEvent.click(grid.querySelector('button'))

    fireEvent.click(await screen.findByRole('button', { name: /practice this sign/i }))

    expect(await screen.findByText('Practice Page')).toBeInTheDocument()
  })

  it('TEST 10.10 — Page loading state (skeleton not blank)', async () => {
    getLessons.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { success: true, data: [] } }), 500)
        }),
    )

    renderLearn()

    expect(await screen.findByLabelText('Lesson skeletons')).toBeInTheDocument()
  })
})
