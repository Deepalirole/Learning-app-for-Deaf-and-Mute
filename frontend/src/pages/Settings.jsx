import React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { changePassword, getProfile, logout, updateProfile } from '../lib/api'
import { isValidEmail, passwordStrength } from '../lib/validators'

export default function Settings() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    getProfile()
      .then((r) => {
        const data = r?.data?.data ?? r?.data
        if (!mounted) return
        setProfile(data)
        setName(data?.name || '')
        setEmail(data?.email || '')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const onSaveProfile = async (e) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess('')

    if (!name.trim()) {
      setSaveError('Name is required')
      return
    }

    if (!email.trim() || !isValidEmail(email)) {
      setSaveError('Invalid email')
      return
    }

    setSaving(true)
    try {
      const r = await updateProfile({ name: name.trim(), email: email.trim() })
      const data = r?.data?.data ?? r?.data
      setProfile(data)
      setSaveSuccess('Profile updated')
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const onChangePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (!currentPassword) {
      setPwError('Current password required')
      return
    }

    const strength = passwordStrength(newPassword)
    if (strength === 'weak') {
      setPwError('Weak password')
      return
    }

    setChangingPw(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setPwSuccess('Password updated')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPwError(err?.response?.data?.message || 'Failed to change password')
    } finally {
      setChangingPw(false)
    }
  }

  const onLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {loading ? (
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6" aria-label="Settings skeleton">
            <div className="h-6 w-40 bg-slate-800 rounded" />
            <div className="mt-4 h-10 w-full bg-slate-800 rounded" />
            <div className="mt-3 h-10 w-full bg-slate-800 rounded" />
          </div>
        ) : (
          <>
            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold">Profile</h2>
              <form className="mt-4 space-y-3" onSubmit={onSaveProfile} aria-label="Profile form">
                <div>
                  <label className="text-sm text-slate-300" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {saveError ? <p className="text-sm text-red-300">{saveError}</p> : null}
                {saveSuccess ? <p className="text-sm text-emerald-300">{saveSuccess}</p> : null}

                <button
                  type="submit"
                  className={
                    saving
                      ? 'rounded-md bg-slate-700 px-4 py-2 opacity-70 cursor-not-allowed'
                      : 'rounded-md bg-indigo-600 hover:bg-indigo-700 px-4 py-2'
                  }
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </form>

              <p className="mt-4 text-xs text-slate-400">User ID: {profile?.id ?? '-'}</p>
            </div>

            <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold">Change Password</h2>
              <form className="mt-4 space-y-3" onSubmit={onChangePassword} aria-label="Change password form">
                <div>
                  <label className="text-sm text-slate-300" htmlFor="currentPassword">
                    Current password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300" htmlFor="newPassword">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                {pwError ? <p className="text-sm text-red-300">{pwError}</p> : null}
                {pwSuccess ? <p className="text-sm text-emerald-300">{pwSuccess}</p> : null}

                <button
                  type="submit"
                  className={
                    changingPw
                      ? 'rounded-md bg-slate-700 px-4 py-2 opacity-70 cursor-not-allowed'
                      : 'rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2'
                  }
                  disabled={changingPw}
                >
                  {changingPw ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold">Session</h2>
              <button
                type="button"
                className={
                  loggingOut
                    ? 'mt-3 rounded-md bg-slate-700 px-4 py-2 opacity-70 cursor-not-allowed'
                    : 'mt-3 rounded-md border border-slate-800 px-4 py-2'
                }
                onClick={onLogout}
                disabled={loggingOut}
              >
                {loggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
