import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import Footer from '../lib/Footer.jsx'
import NotFound from '../pages/NotFound.jsx'

function Shell({ initialEntries }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/"
          element={
            <div>
              <div>Home</div>
              <Footer />
            </div>
          }
        />
        <Route path="/about" element={<div>About Page</div>} />
        <Route path="/support" element={<div>Support Page</div>} />
        <Route path="/privacy" element={<div>Privacy Page</div>} />
        <Route path="/terms" element={<div>Terms Page</div>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Footer + support pages', () => {
  it('TEST 23.1 — Footer renders support links', () => {
    render(<Shell initialEntries={['/']} />)

    expect(screen.getByLabelText('Footer')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Privacy')).toBeInTheDocument()
    expect(screen.getByText('Terms')).toBeInTheDocument()
  })

  it('TEST 23.2 — Footer links navigate', () => {
    render(<Shell initialEntries={['/']} />)

    fireEvent.click(screen.getByText('About'))
    expect(screen.getByText('About Page')).toBeInTheDocument()
  })

  it('TEST 23.3 — 404 page renders on unknown routes', () => {
    render(<Shell initialEntries={['/does-not-exist']} />)

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByLabelText('404 actions')).toBeInTheDocument()
  })
})
