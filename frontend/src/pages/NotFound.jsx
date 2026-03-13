import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">404</h1>
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-slate-200">This page doesn’t exist.</p>
          <div className="mt-4 flex flex-wrap gap-3" aria-label="404 actions">
            <Link className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-4 py-2" to="/login">
              Go to login
            </Link>
            <Link className="rounded-md border border-slate-800 px-4 py-2" to="/dashboard">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
