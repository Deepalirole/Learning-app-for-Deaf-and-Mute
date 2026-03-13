import { describe, expect, it, vi, beforeEach } from 'vitest'

var requestUse
var responseUse

vi.mock('axios', () => {
  const api = {
    interceptors: {
      request: {
        use: vi.fn((fn) => {
          requestUse = fn
        }),
      },
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          responseUse = onRejected
          return onFulfilled
        }),
      },
    },
    post: vi.fn(),
    request: vi.fn(),
  }

  return {
    default: {
      create: vi.fn(() => api),
    },
  }
})

import { api, clearAccessToken, getAccessToken, setAccessToken } from '../lib/api'

beforeEach(() => {
  vi.clearAllMocks()
  clearAccessToken()
})

describe('API refresh-token interceptor', () => {
  it('TEST 17.1 — On 401, calls refresh-token and retries original request', async () => {
    expect(typeof responseUse).toBe('function')

    api.post.mockResolvedValueOnce({ data: { success: true, data: { token: 'new-token' } } })
    api.request.mockResolvedValueOnce({ data: { success: true } })

    const err = {
      response: { status: 401 },
      config: { url: '/progress', method: 'get', headers: {} },
    }

    const result = await responseUse(err)

    expect(api.post).toHaveBeenCalledWith(
      '/auth/refresh-token',
      null,
      expect.objectContaining({ _skipAuthRefresh: true, _skipAuthHeader: true }),
    )
    expect(getAccessToken()).toBe('new-token')
    expect(api.request).toHaveBeenCalled()
    expect(result).toEqual({ data: { success: true } })
  })

  it('TEST 17.2 — Request interceptor attaches Authorization header when token set', async () => {
    expect(typeof requestUse).toBe('function')

    setAccessToken('abc')
    const cfg = requestUse({ headers: {} })
    expect(cfg.headers.Authorization).toBe('Bearer abc')
  })
})
