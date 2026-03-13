import React from 'react'

import { CONTACT_EMAIL } from '../constants'
import Footer from '../lib/Footer.jsx'

export default function Support() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="p-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold">Support</h1>
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-200">
              For account issues, camera troubleshooting, or learning guidance, email us at{' '}
              <a className="text-indigo-400 underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <div className="mt-4">
              <h2 className="text-lg font-semibold">Quick tips</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-300" aria-label="Support tips">
                <li>Allow camera permission in your browser.</li>
                <li>Use good lighting and keep your hand in frame.</li>
                <li>Try switching the camera if detection is unstable.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
