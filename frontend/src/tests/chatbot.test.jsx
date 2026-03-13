import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import Chatbot from '../pages/Chatbot.jsx'

vi.mock('../lib/api', () => {
  return {
    sendChatbotMessage: vi.fn(async () => ({ data: { reply: 'Hello from AI' } })),
  }
})

import { sendChatbotMessage } from '../lib/api'

function renderChatbot() {
  return render(
    <MemoryRouter initialEntries={['/chatbot']}>
      <Routes>
        <Route path="/chatbot" element={<Chatbot />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Chatbot page', () => {
  it('TEST 14.1 — Renders initial assistant message and disables send on empty', async () => {
    renderChatbot()

    expect(screen.getByText('Chatbot')).toBeInTheDocument()
    expect(screen.getByLabelText('Chat messages')).toBeInTheDocument()

    expect(screen.getByText(/your signlearn assistant/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('TEST 14.2 — Sending a message appends user turn and assistant reply', async () => {
    renderChatbot()

    await userEvent.type(screen.getByLabelText('Message input'), 'Hi')
    expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('Hi')).toBeInTheDocument()
    expect(await screen.findByText('Hello from AI')).toBeInTheDocument()

    expect(sendChatbotMessage).toHaveBeenCalled()
    const call = sendChatbotMessage.mock.calls[0][0]
    expect(call.message).toBe('Hi')
    expect(Array.isArray(call.conversationHistory)).toBe(true)
  })

  it('TEST 14.3 — API error shows an error message', async () => {
    sendChatbotMessage.mockRejectedValueOnce(new Error('fail'))
    renderChatbot()

    await userEvent.type(screen.getByLabelText('Message input'), 'Help')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('Failed to send message')).toBeInTheDocument()
  })
})
