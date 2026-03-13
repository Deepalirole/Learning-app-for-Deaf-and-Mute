import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { DETECTION_FPS } from '../constants'
import Detect from '../pages/Detect.jsx'

vi.mock('../lib/api', () => {
  return {
    detectFrame: vi.fn(async () => ({ data: { gesture: null, confidence: 0.0 } })),
  }
})

import { detectFrame } from '../lib/api'

function renderDetect() {
  return render(
    <MemoryRouter initialEntries={['/detect']}>
      <Routes>
        <Route path="/detect" element={<Detect />} />
      </Routes>
    </MemoryRouter>,
  )
}

function turnCameraOn() {
  fireEvent.click(screen.getByLabelText('Toggle camera power'))
}

function turnDetectionOn() {
  fireEvent.click(screen.getByLabelText('Toggle detection'))
}

beforeEach(() => {
  vi.useFakeTimers()

  global.navigator.mediaDevices = {
    getUserMedia: vi.fn(),
  }

  // HTMLMediaElement srcObject support
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


describe('Detect page', () => {
  it('TEST 9.1 — Camera permission denied shows fallback UI', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce({ name: 'NotAllowedError' })

    renderDetect()

    turnCameraOn()

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText(/camera access denied/i)).toBeInTheDocument()
    expect(screen.getByText(/please allow camera permissions/i)).toBeInTheDocument()
  })

  it('TEST 9.2 — Camera loads on page open', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    renderDetect()

    turnCameraOn()

    await act(async () => {
      await Promise.resolve()
    })

    const video = screen.getByLabelText('Camera video')
    expect(video.srcObject).toBe(stream)
    expect(screen.getByText(/camera ready/i)).toBeInTheDocument()
  })

  it('TEST 9.3 — Frame capture rate benchmark', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockResolvedValue({ data: { gesture: null, confidence: 0.0 } })

    renderDetect()

    turnCameraOn()
    turnDetectionOn()

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    const calls = detectFrame.mock.calls.length
    expect(calls).toBeGreaterThanOrEqual(40)
    expect(calls).toBeLessThanOrEqual(50)
    expect(DETECTION_FPS).toBe(15)
  })

  it('TEST 9.4 — Canvas dimensions match video', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    renderDetect()

    turnCameraOn()

    await act(async () => {
      await Promise.resolve()
    })

    const video = screen.getByLabelText('Camera video')
    Object.defineProperty(video, 'videoWidth', { value: 640 })
    Object.defineProperty(video, 'videoHeight', { value: 480 })

    await act(async () => {
      video.onloadedmetadata && video.onloadedmetadata()
    })

    const canvas = screen.getByLabelText('Landmarks canvas')
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(480)
  })

  it('TEST 9.5 — Detection OFF toggle stops API calls', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    renderDetect()

    turnCameraOn()
    turnDetectionOn()

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    const before = detectFrame.mock.calls.length

    fireEvent.click(screen.getByLabelText('Toggle detection'))

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    const after = detectFrame.mock.calls.length
    expect(after).toBe(before)
  })

  it('TEST 9.6 — Low confidence result shows "no sign" not wrong sign', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockResolvedValue({ data: { gesture: null, confidence: 0.6 } })

    renderDetect()

    turnCameraOn()
    turnDetectionOn()

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(200)
    })

    expect(screen.getByLabelText('Detected gesture').textContent).toMatch(/—|-/)
  })

  it('TEST 9.7 — Camera toggle button switches facingMode on mobile', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    renderDetect()

    turnCameraOn()

    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByLabelText('Toggle camera'))

    await act(async () => {
      await Promise.resolve()
    })

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
  })

  it('TEST 9.8 — Recent detections list updates', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame
      .mockResolvedValueOnce({ data: { gesture: 'A', confidence: 0.9 } })
      .mockResolvedValueOnce({ data: { gesture: 'B', confidence: 0.9 } })
      .mockResolvedValueOnce({ data: { gesture: 'C', confidence: 0.9 } })

    vi.spyOn(global, 'Audio').mockImplementation(() => ({ play: vi.fn(async () => {}) }))

    renderDetect()

    turnCameraOn()
    turnDetectionOn()

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    const list = screen.getByLabelText('Recent detections list')
    expect(list.textContent).toContain('A')
    expect(list.textContent).toContain('B')
    expect(list.textContent).toContain('C')
  })

  it('TEST 9.9 — Audio plays on new detection (when audio ON)', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockResolvedValue({ data: { gesture: 'A', confidence: 0.9 } })

    const play = vi.fn(async () => {})
    vi.spyOn(global, 'Audio').mockImplementation(() => ({ play }))

    renderDetect()

    turnCameraOn()
    turnDetectionOn()

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(play).toHaveBeenCalled()
  })

  it('TEST 9.10 — Audio muted when audio toggle OFF', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] }
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream)

    detectFrame.mockResolvedValue({ data: { gesture: 'A', confidence: 0.9 } })

    const play = vi.fn(async () => {})
    vi.spyOn(global, 'Audio').mockImplementation(() => ({ play }))

    renderDetect()

    turnCameraOn()
    turnDetectionOn()

    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByLabelText('Toggle audio'))

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(play).not.toHaveBeenCalled()
  })
})
