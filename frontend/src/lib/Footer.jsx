import React from 'react'
import { Link } from 'react-router-dom'

import { CONTACT_EMAIL } from '../constants'

export default function Footer({ variant }) {
  const marketing = variant === 'marketing'

  return (
    <footer
      className={
        marketing ? 'border-t border-slate-200 bg-slate-950 text-white' : 'border-t border-slate-800 bg-slate-950'
      }
      aria-label="Footer"
    >
      <div className={marketing ? 'max-w-6xl mx-auto px-4 py-12' : 'max-w-6xl mx-auto px-4 py-6'}>
        {marketing ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">✋</span>
                <span>SignAI</span>
              </div>
              <p className="mt-4 text-sm text-slate-300">Making sign language learning accessible through AI technology.</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Platform</p>
              <nav className="mt-3 flex flex-col gap-2 text-sm" aria-label="Footer links">
                <Link className="text-slate-300 hover:text-white" to="/detect">
                  Detection
                </Link>
                <Link className="text-slate-300 hover:text-white" to="/learn">
                  Learn
                </Link>
                <Link className="text-slate-300 hover:text-white" to="/practice">
                  Practice
                </Link>
                <Link className="text-slate-300 hover:text-white" to="/dashboard">
                  Dashboard
                </Link>
              </nav>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Support</p>
              <div className="mt-3 text-sm text-slate-300">
                <p>
                  Help:{' '}
                  <a className="text-indigo-300 hover:text-white underline" href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>
              <nav className="mt-3 flex flex-col gap-2 text-sm" aria-label="Footer support links">
                <Link className="text-slate-300 hover:text-white" to="/support">
                  Help Center
                </Link>
                <Link className="text-slate-300 hover:text-white" to="/privacy">
                  Privacy Policy
                </Link>
                <Link className="text-slate-300 hover:text-white" to="/terms">
                  Terms of Service
                </Link>
              </nav>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Connect</p>
              <p className="mt-3 text-sm text-slate-300">Built with care for the deaf and mute community.</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-300">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p>
                Support:{' '}
                <a className="text-indigo-400 underline" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </p>
              <nav className="flex flex-wrap gap-4" aria-label="Footer links">
                <Link className="text-slate-200 hover:text-white underline" to="/about">
                  About
                </Link>
                <Link className="text-slate-200 hover:text-white underline" to="/support">
                  Support
                </Link>
                <Link className="text-slate-200 hover:text-white underline" to="/privacy">
                  Privacy
                </Link>
                <Link className="text-slate-200 hover:text-white underline" to="/terms">
                  Terms
                </Link>
              </nav>
            </div>
          </div>
        )}

        {marketing ? (
          <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-400">© 2024 SignAI. All rights reserved.</div>
        ) : null}
      </div>
    </footer>
  )
}
