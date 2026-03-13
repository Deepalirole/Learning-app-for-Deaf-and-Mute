import React from 'react'
import { useState } from 'react'

import { forgotPassword } from '../lib/api'
import Footer from '../lib/Footer.jsx'
import { isValidEmail } from '../lib/validators'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const canSubmit = isValidEmail(email) && !loading

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      await forgotPassword({ email: email.trim() })
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h1 className="text-2xl font-semibold">Forgot password</h1>

        {done ? (
          <p className="mt-4 text-slate-200">Check your email</p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="mt-4">
              <label className="block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                aria-label="Email"
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={
                canSubmit
                  ? 'mt-6 w-full rounded-md bg-indigo-500 hover:bg-indigo-600 px-3 py-2 font-medium'
                  : 'mt-6 w-full rounded-md bg-slate-700 px-3 py-2 font-medium opacity-60 cursor-not-allowed'
              }
            >
              {loading ? (
                <span aria-label="Loading" className="inline-block">
                  Loading...
                </span>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
        )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
