import React from 'react'
import { Link, NavLink } from 'react-router-dom'

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive
          ? 'inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1.5 text-sm font-medium'
          : 'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100'
      }
    >
      {label}
    </NavLink>
  )
}

export default function PublicNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900" aria-label="SignLearn home">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">✋</span>
          <span>SignAI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-2" aria-label="Public navigation">
          <NavItem to="/" label="Home" />
          <NavItem to="/detect" label="Detect" />
          <NavItem to="/learn" label="Learn" />
          <NavItem to="/practice" label="Practice" />
          <NavItem to="/dashboard" label="Dashboard" />
        </nav>

        <div className="flex items-center gap-2">
          <Link className="text-sm font-medium text-slate-700 hover:text-slate-900" to="/login">
            Login
          </Link>
          <Link
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold"
            to="/signup"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  )
}
