import React from 'react'
import { useEffect, useMemo, useState } from 'react'

import { getProgress } from '../lib/api'

function BadgeCard({ title }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-sm text-slate-300">Badge</p>
      <p className="mt-2 text-lg font-semibold">{title}</p>
    </div>
  )
}

export default function Achievements() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')

    getProgress()
      .then((r) => {
        const data = r?.data?.data ?? r?.data
        if (!mounted) return
        setProgress(data)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.response?.data?.message || 'Failed to load achievements')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const badges = useMemo(() => {
    const raw = progress?.badges_earned
    return Array.isArray(raw) ? raw : []
  }, [progress])

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">Achievements</h1>
        <p className="mt-2 text-sm text-slate-300">Your earned badges based on learning progress and streaks.</p>

        {loading ? (
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6" aria-label="Achievements skeleton">
            <div className="h-6 w-40 bg-slate-800 rounded" />
            <div className="mt-4 h-16 w-full bg-slate-800 rounded" />
            <div className="mt-3 h-16 w-full bg-slate-800 rounded" />
          </div>
        ) : (
          <>
            {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

            {!error && badges.length === 0 ? (
              <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <p className="text-sm text-slate-300">No badges earned yet.</p>
                <p className="mt-2 text-sm text-slate-400">Complete lessons and keep your streak to unlock badges.</p>
              </div>
            ) : null}

            {!error && badges.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Badges list">
                {badges.map((b, idx) => (
                  <BadgeCard key={`${b}-${idx}`} title={b} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
