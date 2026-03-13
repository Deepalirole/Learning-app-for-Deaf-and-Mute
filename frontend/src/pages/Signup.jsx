import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { setAccessToken, signup } from '../lib/api'
import Footer from '../lib/Footer.jsx'
import { isStrongPassword, isValidEmail, passwordStrength } from '../lib/validators'

export default function Signup() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [emailAvailable, setEmailAvailable] = useState(null)
  const [checkingEmail, setCheckingEmail] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const emailValid = isValidEmail(email)
  const strength = useMemo(() => passwordStrength(password), [password])

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 ? password === confirmPassword : true

  useEffect(() => {
    setError('')
  }, [name, email, password, confirmPassword])

  useEffect(() => {
    if (!emailValid) {
      setEmailAvailable(null)
      return
    }

    setCheckingEmail(true)
    const t = setTimeout(() => {
      setEmailAvailable(true)
      setCheckingEmail(false)
    }, 500)

    return () => clearTimeout(t)
  }, [email, emailValid])

  const canSubmit =
    name.trim().length > 0 &&
    emailValid &&
    emailAvailable !== false &&
    isStrongPassword(password) &&
    password === confirmPassword &&
    !loading

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    try {
      const r = await signup({ name: name.trim(), email: email.trim(), password })
      const token = r?.data?.data?.token
      if (token) setAccessToken(token)
      navigate('/login')
    } catch (err) {
      const status = err?.response?.status
      if (status === 400) {
        setError(err?.response?.data?.message || 'Unable to sign up')
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
          <h1 className="text-2xl font-semibold">Create your account</h1>

        <div className="mt-4">
          <label className="block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            aria-label="Name"
            className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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
          {!emailValid && email.length > 0 ? (
            <p className="mt-1 text-sm text-red-400">Invalid email format</p>
          ) : null}
          {checkingEmail ? <p className="mt-1 text-sm text-slate-300">Checking email...</p> : null}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="password"
              aria-label="Password"
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label="Toggle password visibility"
              className="rounded-md border border-slate-800 px-3 py-2"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="mt-3">
            <p
              className={
                strength === 'strong'
                  ? 'text-sm text-emerald-400'
                  : strength === 'medium'
                  ? 'text-sm text-yellow-400'
                  : 'text-sm text-red-400'
              }
            >
              {strength === 'strong' ? 'Strong' : strength === 'medium' ? 'Medium' : 'Weak'}
            </p>
            <div className="mt-2 h-2 w-full rounded bg-slate-800 overflow-hidden" aria-label="Password strength">
              <div
                className={
                  strength === 'strong'
                    ? 'h-2 w-full bg-emerald-500'
                    : strength === 'medium'
                    ? 'h-2 w-2/3 bg-yellow-500'
                    : 'h-2 w-1/3 bg-red-500'
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="confirmPassword"
              aria-label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label="Toggle confirm password visibility"
              className="rounded-md border border-slate-800 px-3 py-2"
              onClick={() => setShowConfirmPassword((s) => !s)}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {!passwordsMatch ? <p className="mt-1 text-sm text-red-400">Passwords do not match</p> : null}
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
            'Sign Up'
          )}
        </button>

        <p className="mt-4 text-sm text-slate-300">
          Already have an account?{' '}
          <button type="button" className="text-indigo-400 underline" onClick={() => navigate('/login')}>
            Log in
          </button>
        </p>
        </form>
      </div>

      <Footer />
    </div>
  )
}
