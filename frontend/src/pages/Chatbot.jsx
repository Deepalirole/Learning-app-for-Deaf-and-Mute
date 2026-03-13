import React from 'react'
import { useMemo, useState } from 'react'

import { sendChatbotMessage } from '../lib/api'

function normalizeHistory(turns) {
  return (turns || []).map((t) => ({
    role: t.role,
    content: t.content,
  }))
}

export default function Chatbot() {
  const [turns, setTurns] = useState([
    {
      role: 'assistant',
      content: "Hi! I’m your SignLearn assistant. Ask me about lessons, practice tips, or using the camera.",
    },
  ])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const canSend = useMemo(() => message.trim().length > 0 && !sending, [message, sending])

  const onSend = async (e) => {
    e.preventDefault()
    const text = message.trim()
    if (!text || sending) return

    setError('')
    setSending(true)

    const nextTurns = [...turns, { role: 'user', content: text }]
    setTurns(nextTurns)
    setMessage('')

    try {
      const r = await sendChatbotMessage({
        message: text,
        conversationHistory: normalizeHistory(nextTurns),
      })
      const reply = r?.data?.reply
      if (reply) {
        setTurns((prev) => [...prev, { role: 'assistant', content: String(reply) }])
      } else {
        setTurns((prev) => [...prev, { role: 'assistant', content: "I couldn't generate a reply. Please try again." }])
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">Chatbot</h1>
        <p className="mt-2 text-sm text-slate-300">Ask questions about sign language learning, practice strategy, or using the app.</p>

        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4" aria-label="Chat messages">
          <div className="space-y-3">
            {turns.map((t, idx) => (
              <div key={idx} className={t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    t.role === 'user'
                      ? 'max-w-[80%] rounded-lg bg-indigo-600 px-3 py-2 text-sm'
                      : 'max-w-[80%] rounded-lg bg-slate-800 px-3 py-2 text-sm'
                  }
                >
                  <p className="text-xs opacity-80">{t.role === 'user' ? 'You' : 'Assistant'}</p>
                  <p className="mt-1 whitespace-pre-wrap">{t.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

        <form className="mt-4 flex gap-2" onSubmit={onSend} aria-label="Chat input form">
          <input
            className="flex-1 rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            aria-label="Message input"
          />
          <button
            type="submit"
            className={
              canSend
                ? 'rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2'
                : 'rounded-md bg-slate-700 px-4 py-2 opacity-70 cursor-not-allowed'
            }
            disabled={!canSend}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
