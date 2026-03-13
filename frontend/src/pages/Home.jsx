import React from 'react'
import { Link } from 'react-router-dom'

import PublicNav from '../lib/PublicNav.jsx'
import Footer from '../lib/Footer.jsx'

function FeatureCard({ title, description, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xl">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  )
}

function Step({ n, title, description }) {
  return (
    <div className="text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-semibold">
        {n}
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicNav />

      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-50" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-emerald-50" />

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl">
              ✋
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
              Learn Sign Language with <span className="text-indigo-600">AI</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-slate-600">
              Experience the future of accessible education. Use real-time gesture detection to learn and practice sign language effectively.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup"
                className="w-full sm:w-auto rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-sm font-semibold"
              >
                Get Started →
              </Link>
              <Link
                to="/detect"
                className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-900"
              >
                ▶ Try Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold">Powerful Features for Effective Learning</h2>
            <p className="mt-3 text-slate-600">
              Our platform combines AI technology with proven learning methods for a smoother, more motivating journey.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              icon="◎"
              title="Real-time Detection"
              description="AI recognizes your hand gestures instantly using your webcam."
            />
            <FeatureCard
              icon="📖"
              title="Interactive Learning"
              description="Step-by-step lessons with visual guides and practice modes."
            />
            <FeatureCard
              icon="📈"
              title="Progress Tracking"
              description="Track your learning journey with stats, streaks, and XP."
            />
            <FeatureCard
              icon="♿"
              title="Accessibility First"
              description="Designed with clear feedback, keyboard support, and labels."
            />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold">How It Works</h2>
            <p className="mt-3 text-slate-600">Start learning sign language in three simple steps.</p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <Step
              n={1}
              title="Create Account"
              description="Sign up for free and set up your personalized learning profile."
            />
            <Step
              n={2}
              title="Start Learning"
              description="Access lessons and practice with real-time feedback."
            />
            <Step
              n={3}
              title="Track Progress"
              description="Monitor your improvement and earn achievements as you master signs."
            />
          </div>
        </div>
      </section>

      <section className="bg-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold">Ready to Start Your Journey?</h2>
            <p className="mt-3 text-indigo-100">
              Join learners improving their sign language with AI-powered practice and progress tracking.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup"
                className="w-full sm:w-auto rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 text-sm font-semibold"
              >
                Start Learning Free
              </Link>
              <Link
                to="/learn"
                className="w-full sm:w-auto rounded-lg bg-indigo-500/30 hover:bg-indigo-500/40 border border-indigo-300/40 px-6 py-3 text-sm font-semibold"
              >
                Browse Lessons
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer variant="marketing" />
    </div>
  )
}
