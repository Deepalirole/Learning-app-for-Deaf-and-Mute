import React from 'react'

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <p className="text-slate-200">Use this app for learning and practice. Do not attempt abuse, scraping, or attacks.</p>
          <p className="text-sm text-slate-300">We may rate-limit requests to keep the service available for everyone.</p>
          <p className="text-sm text-slate-300">The app is provided as-is without warranties.</p>
        </div>
      </div>
    </div>
  )
}
