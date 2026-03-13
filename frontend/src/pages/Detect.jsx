import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { API_URL, DETECTION_FPS, MIN_CONFIDENCE } from '../constants'
import { detectFrame } from '../lib/api'

function toBase64FromCanvas(canvas) {
  try {
    if (typeof canvas?.toDataURL !== 'function') return 'data:image/jpeg;base64,'
    return canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return 'data:image/jpeg;base64,'
  }
}

export default function Detect() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)
  const streamRef = useRef(null)
  const cameraReqIdRef = useRef(0)

  const [cameraStatus, setCameraStatus] = useState('off')
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [cameraOn, setCameraOn] = useState(false)

  const [detectOn, setDetectOn] = useState(false)
  const [audioOn, setAudioOn] = useState(true)

  const [gesture, setGesture] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [recent, setRecent] = useState([])

  const captureMs = useMemo(() => 1000 / DETECTION_FPS, [])

  const stopLoop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const stopCamera = () => {
    const v = videoRef.current
    const stream = streamRef.current || v?.srcObject
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((t) => t.stop())
    }
    if (v) {
      try {
        v.pause()
      } catch {
        // ignore
      }
      v.srcObject = null
    }
    streamRef.current = null
    setCameraStatus('off')
  }

  const startCamera = async (mode) => {
    setCameraStatus('loading')
    setPermissionDenied(false)

    const reqId = ++cameraReqIdRef.current

    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: 640,
          height: 480,
        },
      })

      if (!cameraOn || reqId !== cameraReqIdRef.current) {
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach((t) => t.stop())
        }
        return
      }

      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      streamRef.current = stream
      setCameraStatus('ready')

      const onMeta = () => {
        const v = videoRef.current
        const c = canvasRef.current
        if (!v || !c) return
        c.width = v.videoWidth
        c.height = v.videoHeight
      }

      videoRef.current.onloadedmetadata = onMeta
    } catch (err) {
      const name = err?.name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPermissionDenied(true)
      }
      setCameraStatus('error')
    }
  }

  const runOnce = async () => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return

    let ctx
    try {
      ctx = c.getContext('2d')
    } catch {
      return
    }
    if (!ctx || typeof ctx.drawImage !== 'function') return

    try {
      if (!c.width || !c.height) {
        c.width = 640
        c.height = 480
      }
      ctx.drawImage(v, 0, 0, c.width, c.height)
    } catch {
      return
    }
    const frame = toBase64FromCanvas(c)

    try {
      const res = await detectFrame({ frame })
      const data = res?.data || res

      const g = data?.gesture ?? null
      const conf = Number(data?.confidence || 0)

      setConfidence(conf)
      if (g && conf >= MIN_CONFIDENCE) {
        setGesture(g)
        setRecent((prev) => [{ gesture: g, confidence: conf, ts: Date.now() }, ...prev].slice(0, 10))

        if (audioOn) {
          const audio = new Audio(`${API_URL}/detect/speech/${encodeURIComponent(g)}`)
          audio.play().catch(() => {})
        }
      } else {
        setGesture(null)
      }
    } catch {
      setGesture(null)
    }
  }

  const startLoop = () => {
    stopLoop()
    intervalRef.current = setInterval(() => {
      runOnce()
    }, captureMs)
  }

  useEffect(() => {
    if (cameraOn) {
      startCamera(facingMode)
    } else {
      cameraReqIdRef.current += 1
      stopLoop()
      stopCamera()
    }

    return () => {
      stopLoop()
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, cameraOn])

  useEffect(() => {
    if (cameraStatus !== 'ready') {
      stopLoop()
      return
    }
    if (!cameraOn) {
      stopLoop()
      return
    }
    if (!detectOn) {
      stopLoop()
      return
    }

    startLoop()
    return () => stopLoop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStatus, detectOn, audioOn, cameraOn])

  const toggleCamera = () => {
    setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))
  }

  const toggleCameraPower = () => {
    setCameraOn((v) => !v)
  }

  const gestureDisplay = gesture ? gesture : '—'
  const confPct = Math.round(confidence * 100)

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Detect</h1>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Toggle camera power"
              className="rounded-md border border-slate-800 px-3 py-2"
              onClick={toggleCameraPower}
            >
              {cameraOn ? 'Camera ON' : 'Camera OFF'}
            </button>
            <button
              type="button"
              aria-label="Toggle camera"
              className="rounded-md border border-slate-800 px-3 py-2"
              onClick={toggleCamera}
              disabled={!cameraOn}
            >
              Switch Camera
            </button>
            <button
              type="button"
              aria-label="Toggle detection"
              className="rounded-md border border-slate-800 px-3 py-2"
              onClick={() => setDetectOn((v) => !v)}
              disabled={!cameraOn}
            >
              {detectOn ? 'Detection ON' : 'Detection OFF'}
            </button>
            <button
              type="button"
              aria-label="Toggle audio"
              className="rounded-md border border-slate-800 px-3 py-2"
              onClick={() => setAudioOn((v) => !v)}
            >
              {audioOn ? 'Audio ON' : 'Audio OFF'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="relative">
              {cameraOn ? (
                <>
                  <video
                    key={facingMode}
                    ref={videoRef}
                    className="w-full rounded-lg bg-black"
                    autoPlay
                    playsInline
                    muted
                    aria-label="Camera video"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    aria-label="Landmarks canvas"
                  />
                </>
              ) : (
                <div
                  className="w-full rounded-lg bg-black/40 border border-slate-800 flex items-center justify-center"
                  style={{ aspectRatio: '4 / 3' }}
                  aria-label="Camera off placeholder"
                >
                  <p className="text-slate-200">Camera is off</p>
                </div>
              )}

              {cameraOn && cameraStatus === 'loading' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <p className="text-slate-200">Camera Loading...</p>
                </div>
              ) : null}

              {cameraOn && permissionDenied ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg p-6">
                  <div>
                    <p className="text-lg font-semibold">Camera access denied</p>
                    <p className="mt-2 text-sm text-slate-200">
                      Please allow camera permissions in your browser settings and refresh the page.
                    </p>
                  </div>
                </div>
              ) : null}

              {cameraOn && cameraStatus === 'ready' && !permissionDenied ? (
                <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-sm">
                  Camera Ready
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-300">Detected Gesture</p>
              <p className="mt-2 text-5xl font-bold" aria-label="Detected gesture">
                {gestureDisplay}
              </p>

              <div className="mt-4">
                <p className="text-sm text-slate-300">Confidence</p>
                <div className="mt-2 h-2 rounded bg-slate-800 overflow-hidden" aria-label="Confidence bar">
                  <div
                    className="h-2 bg-emerald-500"
                    style={{ width: `${Math.min(100, Math.max(0, confPct))}%` }}
                  />
                </div>
                <p className="mt-2 text-sm">{confPct}%</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-300">Recent detections</p>
              <ul className="mt-2 space-y-2" aria-label="Recent detections list">
                {recent.length === 0 ? <li className="text-sm text-slate-400">No detections yet</li> : null}
                {recent.map((r) => (
                  <li key={r.ts} className="flex items-center justify-between text-sm border border-slate-800 rounded-md px-3 py-2">
                    <span>{r.gesture}</span>
                    <span className="text-slate-300">{Math.round(r.confidence * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
