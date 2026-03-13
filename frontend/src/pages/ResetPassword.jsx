import React from 'react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { resetPassword } from '../lib/api'
import Footer from '../lib/Footer.jsx'
import { isStrongPassword, passwordStrength } from '../lib/validators'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const query = useQuery()
  const token = query.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const strength = passwordStrength(password)
  const canSubmit = token.length > 0 && isStrongPassword(password) && password === confirmPassword && !loading

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await resetPassword({ token, newPassword: password })
      navigate('/login')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center justify-center p-4">
        <form onSubmit={onSubmit} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h1 className="text-2xl font-semibold">Reset password</h1>

        <div className="mt-4">
          <label className="block text-sm font-medium" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            aria-label="New Password"
            type="password"
            className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <p
            className={
              strength === 'strong'
                ? 'mt-2 text-sm text-emerald-400'
                : strength === 'medium'
                ? 'mt-2 text-sm text-yellow-400'
                : 'mt-2 text-sm text-red-400'
            }
          >
            {strength === 'strong' ? 'Strong' : strength === 'medium' ? 'Medium' : 'Weak'}
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            aria-label="Confirm Password"
            type="password"
            className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword ? (
            <p className="mt-1 text-sm text-red-400">Passwords do not match</p>
          ) : null}
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
            'Reset password'
          )}
        </button>
        </form>
      </div>

      <Footer />
    </div>
  )
}
