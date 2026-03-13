import React from 'react'
import { useEffect, useMemo, useState } from 'react'

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getLeaderboard, getProgress } from '../lib/api'

function StatCard({ label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function buildWeekData(raw) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const base = days.map((d) => ({ day: d, lessons: 0 }))
  if (!Array.isArray(raw)) return base

  for (const r of raw) {
    const idx = base.findIndex((x) => x.day === r.day)
    if (idx >= 0) base[idx].lessons = Number(r.lessons || 0)
  }
  return base
}

function buildAccuracyData(raw) {
  const base = Array.from({ length: 7 }).map((_, i) => ({ session: i + 1, accuracy: 0 }))
  if (!Array.isArray(raw) || raw.length === 0) return base

  const list = raw.slice(-7)
  return base.map((x, i) => ({ ...x, accuracy: Number(list[i] ?? 0) }))
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.allSettled([getProgress(), getLeaderboard()]).then((results) => {
      if (!mounted) return

      const p = results[0].status === 'fulfilled' ? results[0].value?.data?.data : null
      const lb = results[1].status === 'fulfilled' ? results[1].value?.data?.data : []

      setProgress(p)
      setLeaderboard(Array.isArray(lb) ? lb : [])
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  const totalLessons = progress?.completed_lessons?.length ?? 0
  const avgAccuracy = progress?.avg_accuracy ?? progress?.accuracy_by_level?.beginner ?? 0
  const totalXp = progress?.total_xp ?? 0
  const badges = progress?.badges_earned?.length ?? 0

  const weekly = useMemo(() => buildWeekData(progress?.weekly_progress), [progress])
  const accuracyTrend = useMemo(() => buildAccuracyData(progress?.accuracy_trend), [progress])

  const recentGestures = (progress?.recent_gestures || []).slice(0, 10)

  const nextUp = useMemo(() => {
    const completedIds = new Set((progress?.completed_lessons || []).map((x) => x.lesson_id))
    const base = 1
    return completedIds.has(base) ? base + 1 : base
  }, [progress])

  const top3 = leaderboard.slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Stats skeletons">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="h-4 w-24 bg-slate-800 rounded" />
                <div className="mt-3 h-7 w-20 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Lessons" value={`${totalLessons} Lessons`} />
            <StatCard label="Practice Accuracy" value={`${Math.round(avgAccuracy * 100)}%`} />
            <StatCard label="XP Points" value={`${totalXp} XP`} />
            <StatCard label="Badges" value={`${badges} Badges`} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold">Weekly Progress</h2>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weekly}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="lessons" stroke="#6366F1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold">Accuracy Trend</h2>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={accuracyTrend}>
                  <XAxis dataKey="session" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="accuracy" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold">Recent Gestures</h2>
            <ul className="mt-3 space-y-2" aria-label="Recent gestures">
              {recentGestures.length === 0 ? <li className="text-sm text-slate-400">No gestures yet</li> : null}
              {recentGestures.map((g, idx) => (
                <li key={idx} className="text-sm flex items-center justify-between border border-slate-800 rounded-md px-3 py-2">
                  <span>{g.gesture}</span>
                  <span className="text-slate-300">{Math.round(Number(g.confidence || 0) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold">Continue Learning</h2>
            <p className="mt-3 text-sm text-slate-200">Next Up: Lesson {nextUp}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold">Leaderboard</h2>
            <ul className="mt-3 space-y-2" aria-label="Leaderboard preview">
              {top3.map((u, idx) => (
                <li key={idx} className="text-sm flex items-center justify-between border border-slate-800 rounded-md px-3 py-2">
                  <span>{u.name}</span>
                  <span className="text-slate-300">{u.total_xp} XP</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-300">
            {progress?.current_streak ?? 0} day streak | Best: {progress?.longest_streak ?? 0} days
          </p>
        </div>
      </div>
    </div>
  )
}
