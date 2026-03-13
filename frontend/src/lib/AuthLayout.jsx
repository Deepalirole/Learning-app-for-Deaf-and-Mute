import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { clearAccessToken, logout } from './api'
import Footer from './Footer.jsx'

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive
          ? 'block rounded-md bg-slate-800 px-3 py-2 text-sm'
          : 'block rounded-md hover:bg-slate-900 px-3 py-2 text-sm text-slate-200'
      }
    >
      {label}
    </NavLink>
  )
}

export default function AuthLayout({ children }) {
  const navigate = useNavigate()
  const onLogout = async () => {
    try {
      await logout()
    } finally {
      clearAccessToken()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">SignLearn</div>
          <button
            type="button"
            className="rounded-md border border-slate-800 px-3 py-2 text-sm"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <nav className="bg-slate-900 border border-slate-800 rounded-xl p-3" aria-label="App navigation">
          <div className="space-y-1">
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/detect" label="Detect" />
            <NavItem to="/learn" label="Learn" />
            <NavItem to="/practice" label="Practice" />
            <NavItem to="/chatbot" label="Chatbot" />
            <NavItem to="/achievements" label="Achievements" />
            <NavItem to="/settings" label="Settings" />
          </div>
        </nav>

        <main>{children}</main>
      </div>

      <Footer />
    </div>
  )
}
