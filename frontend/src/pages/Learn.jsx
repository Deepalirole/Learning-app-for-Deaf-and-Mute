import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { completeLesson, getLessonDetail, getLessons, getLevels, getQuiz } from '../lib/api'

function ProgressBar({ completedCount, totalCount }) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const widthClass = (p) => {
    const bucket = Math.max(0, Math.min(100, Math.round(p / 5) * 5))
    const map = {
      0: 'w-[0%]',
      5: 'w-[5%]',
      10: 'w-[10%]',
      15: 'w-[15%]',
      20: 'w-[20%]',
      25: 'w-[25%]',
      30: 'w-[30%]',
      35: 'w-[35%]',
      40: 'w-[40%]',
      45: 'w-[45%]',
      50: 'w-[50%]',
      55: 'w-[55%]',
      60: 'w-[60%]',
      65: 'w-[65%]',
      70: 'w-[70%]',
      75: 'w-[75%]',
      80: 'w-[80%]',
      85: 'w-[85%]',
      90: 'w-[90%]',
      95: 'w-[95%]',
      100: 'w-[100%]',
    }
    return map[bucket] || 'w-[0%]'
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>Progress</span>
        <span aria-label="Progress percent">{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full rounded bg-slate-800 overflow-hidden">
        <div className={`h-2 bg-emerald-500 ${widthClass(pct)}`} />
      </div>
    </div>
  )
}

export default function Learn() {
  const navigate = useNavigate()

  const [levels, setLevels] = useState([])
  const [selectedLevel, setSelectedLevel] = useState('beginner')
  const [category, setCategory] = useState('alphabet')

  const [loadingLevels, setLoadingLevels] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(true)

  const [lessons, setLessons] = useState([])

  const [activeLessonId, setActiveLessonId] = useState(null)
  const [lessonDetail, setLessonDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [quizOpen, setQuizOpen] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quiz, setQuiz] = useState([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [quizAnswered, setQuizAnswered] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoadingLevels(true)
    getLevels()
      .then((r) => {
        const data = r?.data?.data ?? r?.data ?? []
        if (mounted) setLevels(data)
      })
      .finally(() => {
        if (mounted) setLoadingLevels(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    setLoadingLessons(true)
    getLessons({ level: selectedLevel, category })
      .then((r) => {
        const data = r?.data?.data ?? r?.data ?? []
        if (mounted) setLessons(data)
      })
      .finally(() => {
        if (mounted) setLoadingLessons(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedLevel, category])

  const completedCount = useMemo(() => lessons.filter((l) => l.completed).length, [lessons])

  const openLesson = async (id) => {
    setActiveLessonId(id)
    setDetailLoading(true)
    try {
      const r = await getLessonDetail({ id })
      const data = r?.data?.data ?? r?.data
      setLessonDetail(data)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeModal = () => {
    setActiveLessonId(null)
    setLessonDetail(null)
    setQuizOpen(false)
    setQuiz([])
    setQuizIndex(0)
    setSelectedOption(null)
    setQuizAnswered(false)
    setQuizScore(0)
    setQuizFinished(false)
  }

  const startQuiz = async () => {
    setQuizOpen(true)
    setQuizLoading(true)
    try {
      const r = await getQuiz({ level: selectedLevel })
      const data = r?.data?.data ?? r?.data ?? []
      setQuiz(data)
      setQuizIndex(0)
      setSelectedOption(null)
      setQuizAnswered(false)
      setQuizScore(0)
      setQuizFinished(false)
    } finally {
      setQuizLoading(false)
    }
  }

  const selectQuizOption = (opt) => {
    const q = quiz[quizIndex]
    if (!q) return
    if (quizAnswered) return
    setSelectedOption(opt)
    setQuizAnswered(true)
    if (opt === q.correct_answer) setQuizScore((s) => s + 1)
  }

  const goNextQuiz = () => {
    if (!quizAnswered) return

    const atEnd = quizIndex >= quiz.length - 1
    if (atEnd) {
      setQuizFinished(true)
      return
    }

    setQuizIndex((i) => i + 1)
    setSelectedOption(null)
    setQuizAnswered(false)
  }

  const restartQuiz = () => {
    setQuizIndex(0)
    setSelectedOption(null)
    setQuizAnswered(false)
    setQuizScore(0)
    setQuizFinished(false)
  }

  const onCompleteLesson = async () => {
    if (!lessonDetail?.id) return
    await completeLesson({ lessonId: lessonDetail.id })
    setLessons((prev) => prev.map((l) => (l.id === lessonDetail.id ? { ...l, completed: true } : l)))
  }

  const levelTitle = (key) => {
    if (key === 'beginner') return 'Level 1 - Alphabet'
    if (key === 'intermediate') return 'Level 2 - Words'
    if (key === 'advanced') return 'Level 3 - Phrases'
    return key
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-semibold">Learn</h1>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <aside className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-300">Levels</p>

            {loadingLevels ? (
              <div className="mt-3 space-y-2">
                <div className="h-10 bg-slate-800 rounded" />
                <div className="h-10 bg-slate-800 rounded" />
                <div className="h-10 bg-slate-800 rounded" />
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {levels.map((l) => (
                  <button
                    key={l.level}
                    type="button"
                    className={
                      selectedLevel === l.level
                        ? 'w-full text-left rounded-md bg-indigo-600 px-3 py-2'
                        : 'w-full text-left rounded-md bg-slate-950 border border-slate-800 px-3 py-2'
                    }
                    onClick={() => {
                      setSelectedLevel(l.level)
                      if (l.level === 'beginner') setCategory('alphabet')
                      if (l.level === 'intermediate') setCategory('words')
                      if (l.level === 'advanced') setCategory('phrases')
                    }}
                  >
                    {levelTitle(l.level)}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6">
              <ProgressBar completedCount={completedCount} totalCount={lessons.length} />
            </div>
          </aside>

          <main className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Lessons</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={
                    category === 'alphabet'
                      ? 'rounded-md bg-slate-800 px-3 py-2 text-sm'
                      : 'rounded-md border border-slate-800 px-3 py-2 text-sm'
                  }
                  onClick={() => setCategory('alphabet')}
                >
                  Alphabet
                </button>
                <button
                  type="button"
                  className={
                    category === 'words'
                      ? 'rounded-md bg-slate-800 px-3 py-2 text-sm'
                      : 'rounded-md border border-slate-800 px-3 py-2 text-sm'
                  }
                  onClick={() => setCategory('words')}
                >
                  Words
                </button>
              </div>
            </div>

            {loadingLessons ? (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" aria-label="Lesson skeletons">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-28 bg-slate-800 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" aria-label="Lesson grid">
                {lessons.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className="relative text-left bg-slate-950 border border-slate-800 rounded-lg p-3 hover:border-indigo-500"
                    onClick={() => openLesson(l.id)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{l.title}</p>
                      {l.completed ? <span aria-label="Completed" className="text-emerald-400">✓</span> : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-300">{l.category}</p>
                  </button>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {activeLessonId ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-label="Lesson modal">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{lessonDetail?.title || 'Loading...'}</h2>
                <p className="mt-1 text-sm text-slate-300">XP: {lessonDetail?.xp_reward ?? '-'}</p>
              </div>
              <button type="button" className="border border-slate-800 rounded-md px-3 py-2" onClick={closeModal}>
                Close
              </button>
            </div>

            {detailLoading ? <div className="mt-4 h-32 bg-slate-800 rounded" /> : null}

            {lessonDetail ? (
              <div className="mt-4">
                <img
                  src={lessonDetail.sign_gif_url}
                  alt={`Sign ${lessonDetail.title}`}
                  className="w-full max-h-64 object-contain rounded-lg border border-slate-800 bg-black"
                />
                <p className="mt-3 text-sm text-slate-200">{lessonDetail.description}</p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-indigo-500 hover:bg-indigo-600 px-3 py-2"
                    onClick={() => navigate('/practice')}
                  >
                    Practice This Sign
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-800 px-3 py-2"
                    onClick={startQuiz}
                  >
                    Take Quiz
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-800 px-3 py-2"
                    onClick={onCompleteLesson}
                  >
                    Mark Complete
                  </button>
                </div>

                {quizOpen ? (
                  <div className="mt-6">
                    {quizLoading ? (
                      <div className="h-24 bg-slate-800 rounded" />
                    ) : (
                      <div>
                        {quiz.length === 0 ? (
                          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
                            <p className="text-sm text-slate-200">No quiz questions available for this level yet.</p>
                          </div>
                        ) : quizFinished ? (
                          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
                            <p className="text-sm text-slate-300">Quiz complete</p>
                            <p className="mt-2 text-xl font-semibold" aria-label="Quiz score">
                              Score: {quizScore} / {quiz.length}
                            </p>
                            <div className="mt-4 flex gap-2">
                              <button type="button" className="rounded-md bg-indigo-500 hover:bg-indigo-600 px-3 py-2" onClick={restartQuiz}>
                                Restart Quiz
                              </button>
                              <button type="button" className="rounded-md border border-slate-800 px-3 py-2" onClick={() => setQuizOpen(false)}>
                                Close Quiz
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-slate-300">
                              Question {quizIndex + 1} of {quiz.length}
                            </p>

                            <div className="mt-3">
                              <img
                                src={quiz[quizIndex]?.prompt_gif_url}
                                alt="Quiz prompt"
                                className="w-full max-h-64 object-contain rounded-lg border border-slate-800 bg-black"
                              />
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {(quiz[quizIndex]?.options || []).map((opt) => {
                                const correct = quiz[quizIndex]?.correct_answer
                                const isSelected = selectedOption === opt
                                const isCorrect = quizAnswered && opt === correct
                                const isWrong = quizAnswered && isSelected && opt !== correct

                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    className={
                                      isCorrect
                                        ? 'rounded-md bg-emerald-600 border border-emerald-500 px-3 py-2 text-sm'
                                        : isWrong
                                          ? 'rounded-md bg-red-600 border border-red-500 px-3 py-2 text-sm'
                                          : 'rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm'
                                    }
                                    onClick={() => selectQuizOption(opt)}
                                    disabled={quizAnswered}
                                  >
                                    {opt}
                                  </button>
                                )
                              })}
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-2">
                              <p className="text-sm text-slate-300" aria-label="Quiz progress">
                                Score: {quizScore}
                              </p>
                              <button
                                type="button"
                                className={
                                  quizAnswered
                                    ? 'rounded-md bg-indigo-500 hover:bg-indigo-600 px-3 py-2 text-sm'
                                    : 'rounded-md bg-slate-700 px-3 py-2 text-sm opacity-70 cursor-not-allowed'
                                }
                                onClick={goNextQuiz}
                                disabled={!quizAnswered}
                              >
                                {quizIndex >= quiz.length - 1 ? 'Finish' : 'Next'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
