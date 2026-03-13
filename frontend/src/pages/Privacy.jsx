import React from 'react'

import Footer from '../lib/Footer.jsx'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="p-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold">Privacy Policy</h1>
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <p className="text-slate-200">We respect your privacy and aim to collect the minimum data required to run the app.</p>
            <p className="text-sm text-slate-300">
              Camera input is used to power gesture detection. Your authentication uses secure tokens and an httpOnly refresh cookie.
            </p>
            <p className="text-sm text-slate-300">Gesture history may be stored to power your dashboard stats and learning progress.</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
