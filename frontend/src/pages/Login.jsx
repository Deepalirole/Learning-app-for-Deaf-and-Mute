import React from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { login, setAccessToken } from '../lib/api'
import Footer from '../lib/Footer.jsx'
import { isValidEmail } from '../lib/validators'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = isValidEmail(email) && password.length > 0 && !loading

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError('')
    try {
      const r = await login({ email: email.trim(), password })
      const token = r?.data?.data?.token
      if (token) setAccessToken(token)
      navigate('/dashboard')
    } catch (err) {
      const status = err?.response?.status
      if (status === 401) {
        setError('Invalid email or password')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center justify-center p-4">
        <form onSubmit={onSubmit} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h1 className="text-2xl font-semibold">Log in</h1>

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

        <div className="mt-4">
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            aria-label="Password"
            type="password"
            className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mt-3">
          <Link to="/forgot-password" className="text-sm text-indigo-400 underline">
            Forgot Password?
          </Link>
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

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
            'Log In'
          )}
        </button>

        <p className="mt-4 text-sm text-slate-300">
          New here?{' '}
          <button type="button" className="text-indigo-400 underline" onClick={() => navigate('/signup')}>
            Create an account
          </button>
        </p>
        </form>
      </div>

      <Footer />
    </div>
  )
}
