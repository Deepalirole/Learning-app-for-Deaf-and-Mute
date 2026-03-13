export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))
}

export function passwordStrength(password) {
  const p = String(password || '')
  if (p.length < 6) return 'weak'
  const hasUpper = /[A-Z]/.test(p)
  const hasNumber = /[0-9]/.test(p)
  const hasSpecial = /[^A-Za-z0-9]/.test(p)
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length
  if (p.length >= 8 && score === 3) return 'strong'
  if (p.length >= 8 && score >= 2) return 'medium'
  return 'weak'
}

export function isStrongPassword(password) {
  const p = String(password || '')
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)
}
