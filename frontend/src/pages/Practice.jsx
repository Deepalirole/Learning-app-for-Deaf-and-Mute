import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { DETECTION_FPS, MIN_CONFIDENCE } from '../constants'
import { detectFrame, updateProgress } from '../lib/api'

const WORD_SIGNS = ['Hello', 'Thank You', 'Please', 'Sorry', 'Yes', 'No', 'Help', 'Water', 'Food', 'Love']

const HINTS = {
  B: 'Incorrect. Try: keep all 4 fingers fully extended',
}

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function getPool(difficulty) {
  if (difficulty === 'beginner') return 'ABCDEFGHIJ'.split('')
  if (difficulty === 'intermediate') return 'KLMNOPQRSTUVWXYZ'.split('')
  return WORD_SIGNS
}

export default function Practice() {
  const location = useLocation()
  const query = useQuery()

  const initialStreak = Number(location.state?.streak ?? query.get('streak') ?? 0)
  const requestedTarget = String(query.get('target') || '').trim()

  const [difficulty, setDifficulty] = useState(null)
  const [sessionOn, setSessionOn] = useState(false)

  const [round, setRound] = useState(0)
  const [target, setTarget] = useState(null)
  const [remaining, setRemaining] = useState(5)

  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [hint, setHint] = useState('')

  const [flash, setFlash] = useState(false)

  const [currentStreak, setCurrentStreak] = useState(initialStreak)
  const [confetti, setConfetti] = useState(false)

  const [cameraStatus, setCameraStatus] = useState('idle')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const timerRef = useRef(null)
  const detectRef = useRef(null)
  const poolRef = useRef([])

  const sessionOnRef = useRef(false)
  const roundRef = useRef(0)
  const targetRef = useRef(null)
  const correctRef = useRef(0)
  const wrongRef = useRef(0)

  const stopLoops = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (detectRef.current) {
      clearInterval(detectRef.current)
      detectRef.current = null
    }
  }

  const stopCamera = () => {
    const v = videoRef.current
    const stream = v?.srcObject
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((t) => t.stop())
    }
    if (v) v.srcObject = null
  }

  const startCamera = async () => {
    setCameraStatus('loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' }, width: 640, height: 480 },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          const c = canvasRef.current
          const v = videoRef.current
          if (!c || !v) return
          c.width = v.videoWidth || 640
          c.height = v.videoHeight || 480
        }
      }
      setCameraStatus('ready')
    } catch {
      setCameraStatus('error')
    }
  }

  const pickTarget = () => {
    const pool = poolRef.current
    const idx = Math.floor(Math.random() * pool.length)
    return pool[idx]
  }

  const nextRound = () => {
    setHint('')
    setRemaining(5)
    const next = (roundRef.current || 0) + 1
    roundRef.current = next
    setRound(next)
    const t = pickTarget()
    targetRef.current = t
    setTarget(t)
  }

  const endSession = () => {
    stopLoops()
    setSessionOn(false)
    sessionOnRef.current = false
    setXpEarned(15)

    const c = correctRef.current
    const w = wrongRef.current
    const totalRounds = 10
    const accuracy = Math.max(0, Math.min(1, totalRounds > 0 ? c / totalRounds : 0))
    updateProgress({ accuracy }).catch(() => {})

    setCurrentStreak((s) => {
      const next = s + 1
      if (next === 7 || next === 30 || next === 100) {
        setConfetti(true)
      }
      return next
    })
  }

  const handleDetection = (detectedGesture, confidence) => {
    if (!sessionOnRef.current) return
    if (!targetRef.current) return
    if (!detectedGesture || confidence < MIN_CONFIDENCE) return

    const detected = String(detectedGesture)
    const expected = String(targetRef.current)

    if (detected === expected) {
      setCorrect((c) => {
        const next = c + 1
        correctRef.current = next
        return next
      })
      setFlash(true)

      window.setTimeout(() => {
        setFlash(false)
      }, 300)

      window.setTimeout(() => {
        const r = roundRef.current
        if (r >= 10) {
          endSession()
          return
        }
        nextRound()
      }, 1500)
    } else {
      setWrong((w) => {
        const next = w + 1
        wrongRef.current = next
        return next
      })
      setHint(HINTS[expected] || 'Incorrect. Try again')
    }
  }

  const startSession = async () => {
    if (!difficulty) return

    poolRef.current = getPool(difficulty)
    correctRef.current = 0
    wrongRef.current = 0
    setCorrect(0)
    setWrong(0)
    setXpEarned(0)
    setConfetti(false)
    setRound(0)
    roundRef.current = 0
    setTarget(null)
    targetRef.current = null
    setHint('')
    setFlash(false)

    // Start camera asynchronously; don't block session start.
    startCamera()

    setSessionOn(true)
    sessionOnRef.current = true
    setRemaining(5)
    const pool = poolRef.current
    const first = requestedTarget && pool.includes(requestedTarget) ? requestedTarget : pickTarget()
    targetRef.current = first
    setTarget(first)
    setRound(1)
    roundRef.current = 1

    stopLoops()

    timerRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          const r = roundRef.current
          if (r >= 10) {
            endSession()
            return 0
          }

          setWrong((w) => {
            const next = w + 1
            wrongRef.current = next
            return next
          })
          nextRound()
          return 0
        }
        return s - 1
      })
    }, 1000)

    const detectIntervalMs = 1000 / DETECTION_FPS
    detectRef.current = setInterval(async () => {
      if (!sessionOnRef.current) return
      const c = canvasRef.current
      const v = videoRef.current
      if (!c || !v) return

      let ctx
      try {
        ctx = c.getContext('2d')
      } catch {
        return
      }
      if (!ctx || typeof ctx.drawImage !== 'function') return

      try {
        ctx.drawImage(v, 0, 0, c.width || 640, c.height || 480)
        const frame = typeof c.toDataURL === 'function' ? c.toDataURL('image/jpeg', 0.7) : 'data:image/jpeg;base64,'
        const res = await detectFrame({ frame })
        const data = res?.data || res
        handleDetection(data?.gesture ?? null, Number(data?.confidence || 0))
      } catch {
        return
      }
    }, detectIntervalMs)
  }

  useEffect(() => {
    return () => {
      stopLoops()
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // total practice session benchmark: +15 XP
    const xp = Math.min(15, Math.round((correct / 10) * 15))
    if (sessionOnRef.current) {
      setXpEarned(xp)
    }
  }, [correct])

  const accuracyPct = round > 0 ? Math.round((correct / Math.max(1, correct + wrong)) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Practice</h1>
          <div className="text-sm text-slate-200" aria-label="Streak">
            <span className="mr-2">🔥</span>
            <span>{currentStreak}</span>
          </div>
        </div>

        {confetti ? <div aria-label="Confetti" className="mt-3 text-emerald-400">Confetti!</div> : null}

        {!sessionOn ? (
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-200">Select difficulty</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                className={
                  difficulty === 'beginner'
                    ? 'rounded-lg bg-indigo-600 px-4 py-3 text-left'
                    : 'rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-left'
                }
                onClick={() => setDifficulty('beginner')}
              >
                Beginner (A-J)
              </button>
              <button
                type="button"
                className={
                  difficulty === 'intermediate'
                    ? 'rounded-lg bg-indigo-600 px-4 py-3 text-left'
                    : 'rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-left'
                }
                onClick={() => setDifficulty('intermediate')}
              >
                Intermediate (K-Z)
              </button>
              <button
                type="button"
                className={
                  difficulty === 'advanced'
                    ? 'rounded-lg bg-indigo-600 px-4 py-3 text-left'
                    : 'rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-left'
                }
                onClick={() => setDifficulty('advanced')}
              >
                Advanced (Words)
              </button>
            </div>

            <button
              type="button"
              className={
                difficulty
                  ? 'mt-6 rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2'
                  : 'mt-6 rounded-md bg-slate-700 px-4 py-2 opacity-60 cursor-not-allowed'
              }
              onClick={startSession}
              disabled={!difficulty}
            >
              Start Practice
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="relative">
                <video ref={videoRef} className="w-full rounded-lg bg-black" autoPlay playsInline muted aria-label="Practice camera" />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-label="Practice canvas" />
                {flash ? (
                  <div
                    aria-label="Success"
                    className="absolute inset-0 rounded-lg bg-emerald-500/20 border border-emerald-500"
                  />
                ) : null}
              </div>
              <p className="mt-3 text-sm text-slate-300">Camera: {cameraStatus}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-sm text-slate-300">Round {round} / 10</p>
              <p className="mt-2 text-lg">Target</p>
              <p className="mt-1 text-4xl font-bold" aria-label="Target sign">
                {target}
              </p>

              <div className="mt-4">
                <p className="text-sm text-slate-300">Countdown</p>
                <p className="mt-1 text-2xl" aria-label="Countdown">
                  {remaining}
                </p>
              </div>

              {hint ? <p className="mt-4 text-sm text-yellow-300">{hint}</p> : null}

              <div className="mt-6 text-sm text-slate-200">
                <p>Correct: {correct}</p>
                <p>Wrong: {wrong}</p>
                <p>Accuracy: {accuracyPct}%</p>
                <p>XP: {xpEarned}</p>
              </div>

              <button
                type="button"
                className="mt-6 w-full rounded-md border border-slate-800 px-3 py-2"
                onClick={endSession}
              >
                End Session
              </button>
            </div>
          </div>
        )}

        {!sessionOn && xpEarned > 0 ? (
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6" aria-label="Session summary">
            <h2 className="text-xl font-semibold">Session Summary</h2>
            <p className="mt-2">Accuracy: {accuracyPct}%</p>
            <p className="mt-1">XP earned: {xpEarned}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
