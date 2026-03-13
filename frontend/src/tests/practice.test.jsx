import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import Practice from '../pages/Practice.jsx'

vi.mock('../lib/api', () => {
  return {
    detectFrame: vi.fn(async () => ({ data: { gesture: null, confidence: 0.0 } })),
    updateProgress: vi.fn(async () => ({ data: { success: true, data: { avg_accuracy: 0.9, current_streak: 1 } } })),
  }
})

import { detectFrame, updateProgress } from '../lib/api'

function renderPractice(initialEntries = ['/practice']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/practice" element={<Practice />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()

  global.navigator.mediaDevices = {
    getUserMedia: vi.fn(),
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

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})


describe('Practice page', () => {
  it('TEST 11.1 — Difficulty selector shows 3 options', () => {
    renderPractice()
    expect(screen.getByText('Beginner (A-J)')).toBeInTheDocument()
    expect(screen.getByText('Intermediate (K-Z)')).toBeInTheDocument()
    expect(screen.getByText('Advanced (Words)')).toBeInTheDocument()
  })

  it('TEST 11.2 — Beginner mode uses correct signs (A-J only)', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    // always return correct gesture for target by reading the DOM target
    detectFrame.mockImplementation(async () => {
      const el = screen.queryByLabelText('Target sign')
      const t = el ? el.textContent : 'A'
      return { data: { gesture: t, confidence: 0.91 } }
    })

    renderPractice()

    fireEvent.click(screen.getByText('Beginner (A-J)'))
    fireEvent.click(screen.getByText('Start Practice'))

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.getByLabelText('Target sign')).toBeInTheDocument()

    const allowed = new Set('ABCDEFGHIJ'.split(''))

    // Advance rounds by triggering detection success timeouts
    for (let i = 0; i < 10; i++) {
      const el = screen.queryByLabelText('Target sign')
      if (!el) break
      const t = el.textContent
      expect(allowed.has(t)).toBe(true)

      await act(async () => {
        vi.advanceTimersByTime(1000 / 15)
      })

      await act(async () => {
        vi.advanceTimersByTime(1600)
      })
    }
  })

  it('TEST 11.3 — Correct sign detection shows success state', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockResolvedValue({ data: { gesture: 'A', confidence: 0.91 } })

    renderPractice(['/practice?target=A'])
    fireEvent.click(screen.getByText('Beginner (A-J)'))
    fireEvent.click(screen.getByText('Start Practice'))

    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(1000 / 15)
      await Promise.resolve()
    })

    expect(screen.getByLabelText('Success')).toBeInTheDocument()
  })

  it('TEST 11.4 — Wrong sign shows hint (not just "wrong")', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockResolvedValue({ data: { gesture: 'A', confidence: 0.91 } })

    renderPractice(['/practice?target=B'])
    fireEvent.click(screen.getByText('Beginner (A-J)'))
    fireEvent.click(screen.getByText('Start Practice'))

    await act(async () => {
      vi.advanceTimersByTime(1000 / 15)
      await Promise.resolve()
    })

    expect(screen.getByText(/incorrect/i)).toBeInTheDocument()
  })

  it('TEST 11.5 — Timer countdown works', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    renderPractice()
    fireEvent.click(screen.getByText('Beginner (A-J)'))
    fireEvent.click(screen.getByText('Start Practice'))

    await act(async () => {
      await Promise.resolve()
    })

    const before = Number(screen.getByLabelText('Countdown').textContent)

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    const after = Number(screen.getByLabelText('Countdown').textContent)
    expect(after).toBe(before - 1)
  })

  it('TEST 11.6 — Session summary shows after 10 signs', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockImplementation(async () => {
      const t = screen.getByLabelText('Target sign').textContent
      return { data: { gesture: t, confidence: 0.91 } }
    })

    renderPractice()
    fireEvent.click(screen.getByText('Beginner (A-J)'))
    fireEvent.click(screen.getByText('Start Practice'))

    await act(async () => {
      await Promise.resolve()
    })

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000 / 15)
      })
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })
    }

    expect(screen.getByLabelText('Session summary')).toBeInTheDocument()
  })

  it('TEST 11.7 — XP calculation in session (+15 XP)', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockImplementation(async () => {
      const t = screen.getByLabelText('Target sign').textContent
      return { data: { gesture: t, confidence: 0.91 } }
    })

    renderPractice()
    fireEvent.click(screen.getByText('Beginner (A-J)'))
    fireEvent.click(screen.getByText('Start Practice'))

    await act(async () => {
      await Promise.resolve()
    })

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000 / 15)
      })
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })
    }

    expect(screen.getByText(/xp earned: 15/i)).toBeInTheDocument()
  })

  it('TEST 11.8 — Streak fire icon visible in header during practice', async () => {
    renderPractice(['/practice?streak=5'])
    expect(screen.getByLabelText('Streak').textContent).toContain('5')
  })

  it('TEST 11.9 — Confetti fires at 7-day streak milestone', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockImplementation(async () => {
      const t = screen.getByLabelText('Target sign').textContent
      return { data: { gesture: t, confidence: 0.91 } }
    })

    renderPractice(['/practice?streak=6'])
    fireEvent.click(screen.getByText('Beginner (A-J)'))
    fireEvent.click(screen.getByText('Start Practice'))

    await act(async () => {
      await Promise.resolve()
    })

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000 / 15)
      })
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })
    }

    expect(screen.getByLabelText('Confetti')).toBeInTheDocument()
  })

  it('TEST 11.10 — Camera auto-opens when session starts', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    renderPractice()
    fireEvent.click(screen.getByText('Beginner (A-J)'))
    fireEvent.click(screen.getByText('Start Practice'))

    await act(async () => {
      await Promise.resolve()
    })

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
  })

  it('TEST 16.1 — Progress sync is called on session end with accuracy', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockImplementation(async () => {
      const t = screen.getByLabelText('Target sign').textContent
      return { data: { gesture: t, confidence: 0.91 } }
    })

    renderPractice()
    fireEvent.click(screen.getByText('Beginner (A-J)'))
    fireEvent.click(screen.getByText('Start Practice'))

    await act(async () => {
      await Promise.resolve()
    })

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000 / 15)
      })
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })
    }

    expect(screen.getByLabelText('Session summary')).toBeInTheDocument()
    expect(updateProgress).toHaveBeenCalled()
    expect(updateProgress.mock.calls[0][0].accuracy).toBeCloseTo(1, 5)
  })
})
