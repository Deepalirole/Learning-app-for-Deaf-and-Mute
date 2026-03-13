import React from 'react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { api, getAccessToken, setAccessToken } from './api'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let mounted = true

    async function check() {
      const token = getAccessToken()
      if (token) {
        if (mounted) setStatus('ok')
        return
      }

      try {
        const r = await api.post('/auth/refresh-token', null, {
          _skipAuthRefresh: true,
          _skipAuthHeader: true,
        })
        const newToken = r?.data?.data?.token
        if (newToken) setAccessToken(newToken)
        if (mounted) setStatus(newToken ? 'ok' : 'deny')
      } catch {
        if (mounted) setStatus('deny')
      }
    }

    check()

    return () => {
      mounted = false
    }
  }, [])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4" aria-label="Auth checking">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-slate-300">Checking session…</p>
        </div>
      </div>
    )
  }

  if (status === 'deny') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
