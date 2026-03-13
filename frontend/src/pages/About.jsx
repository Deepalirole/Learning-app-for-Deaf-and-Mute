import React from 'react'

import { APP_NAME, CONTACT_EMAIL } from '../constants'
import Footer from '../lib/Footer.jsx'

export default function About() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="p-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold">About</h1>
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-200">
              {APP_NAME} helps you learn sign language with guided lessons, practice sessions, and real-time detection.
            </p>
            <p className="mt-3 text-sm text-slate-300">
              If you need help, contact{' '}
              <a className="text-indigo-400 underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
