import axios from 'axios'

import { API_URL } from '../constants'

let accessToken = null

export function setAccessToken(token) {
  accessToken = token ? String(token) : null
}

export function getAccessToken() {
  return accessToken
}

export function clearAccessToken() {
  accessToken = null
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (!config) return config
  if (config._skipAuthHeader) return config
  if (accessToken) {
    config.headers = config.headers || {}
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    const original = error?.config

    if (!original) throw error
    if (original._skipAuthRefresh) throw error

    if (status === 401 && !original._retry) {
      original._retry = true
      try {
        const r = await api.post('/auth/refresh-token', null, {
          _skipAuthRefresh: true,
          _skipAuthHeader: true,
        })
        const token = r?.data?.data?.token
        if (token) setAccessToken(token)
        original.headers = original.headers || {}
        if (token) original.headers.Authorization = `Bearer ${token}`
        return api.request(original)
      } catch (e) {
        clearAccessToken()
        throw error
      }
    }

    throw error
  },
)

export async function signup({ name, email, password }) {
  return api.post('/auth/signup', { name, email, password })
}

export async function login({ email, password }) {
  return api.post('/auth/login', { email, password })
}

export async function forgotPassword({ email }) {
  return api.post('/auth/forgot-password', { email })
}

export async function resetPassword({ token, newPassword }) {
  return api.post('/auth/reset-password', { token, new_password: newPassword })
}

export async function detectFrame({ frame }) {
  return api.post('/detect', { frame })
}

export async function getLevels() {
  return api.get('/learn/levels')
}

export async function getLessons({ level, category }) {
  const params = {}
  if (category) params.category = category
  return api.get(`/learn/lessons/${level}`, { params })
}

export async function getLessonDetail({ id }) {
  return api.get(`/learn/lesson/${id}`)
}

export async function getQuiz({ level }) {
  return api.get(`/learn/quiz/${level}`)
}

export async function completeLesson({ lessonId }) {
  return api.post(`/learn/complete/${lessonId}`)
}

export async function getProgress() {
  return api.get('/progress')
}

export async function updateProgress({ accuracy }) {
  return api.post('/progress/update', { accuracy })
}

export async function getLeaderboard() {
  return api.get('/progress/leaderboard')
}

export async function getProfile() {
  return api.get('/auth/profile')
}

export async function updateProfile({ name, email }) {
  return api.put('/auth/profile', { name, email })
}

export async function changePassword({ currentPassword, newPassword }) {
  return api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}

export async function logout() {
  const r = await api.post('/auth/logout')
  clearAccessToken()
  return r
}

export async function sendChatbotMessage({ message, conversationHistory }) {
  return api.post('/chatbot/message', {
    message,
    conversation_history: conversationHistory || [],
  })
}
